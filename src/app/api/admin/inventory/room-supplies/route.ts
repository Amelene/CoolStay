import { logAdminAction } from "@/lib/admin-logger";
import { ROLES } from "@/lib/role_config";
import { authorizeRole } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type MovementType = "in" | "out";

type SupplyMovementInput = {
  supply_id: unknown;
  quantity: unknown;
  notes?: unknown;
};

const ROOM_SUPPLY_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK];

const isMovementType = (value: unknown): value is MovementType =>
  value === "in" || value === "out";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeRole(supabase, ROOM_SUPPLY_ROLES);
    if (authError) return authError;

    const { data, error } = await supabase
      .from("inventory_supplies")
      .select("id, item_name, current_stock, unit")
      .is("archived_at", null)
      .order("category", { ascending: true })
      .order("item_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ supplies: data || [] });
  } catch (error) {
    console.error("Room supplies fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load supplies" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeRole(
      supabase,
      ROOM_SUPPLY_ROLES,
    );
    if (authError) return authError;

    const body = await request.json();
    const roomId = body.room_id;
    const movementType = body.movement_type;
    const rows = body.items;
    const usageDate = body.usage_date;

    if (typeof roomId !== "string" || !isMovementType(movementType)) {
      return NextResponse.json(
        { error: "A valid room and movement type are required." },
        { status: 400 },
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "At least one supply item is required." },
        { status: 400 },
      );
    }

    const parsedRows = rows.map((row: SupplyMovementInput, index: number) => {
      const quantity = Number(row.quantity);
      return {
        index,
        supply_id: typeof row.supply_id === "string" ? row.supply_id : "",
        quantity,
        notes: typeof row.notes === "string" ? row.notes.trim() : "",
      };
    });

    const invalidRow = parsedRows.find(
      (row) => !row.supply_id || !Number.isFinite(row.quantity) || row.quantity <= 0,
    );

    if (invalidRow) {
      return NextResponse.json(
        { error: `Supply row ${invalidRow.index + 1} is incomplete or invalid.` },
        { status: 400 },
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("room_inventory")
      .select("id, room_number")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const supplyIds = Array.from(new Set(parsedRows.map((row) => row.supply_id)));
    const { data: supplies, error: suppliesError } = await supabase
      .from("inventory_supplies")
      .select("id, item_name, current_stock")
      .in("id", supplyIds)
      .is("archived_at", null);

    if (suppliesError) throw suppliesError;

    const supplyMap = new Map((supplies || []).map((item) => [item.id, item]));
    const missingSupplyId = supplyIds.find((id) => !supplyMap.has(id));

    if (missingSupplyId) {
      return NextResponse.json(
        { error: "One or more selected inventory items could not be found." },
        { status: 404 },
      );
    }

    const deltaBySupply = new Map<string, number>();
    parsedRows.forEach((row) => {
      const current = deltaBySupply.get(row.supply_id) || 0;
      deltaBySupply.set(
        row.supply_id,
        current + (movementType === "in" ? row.quantity : -row.quantity),
      );
    });

    for (const [supplyId, delta] of deltaBySupply.entries()) {
      const item = supplyMap.get(supplyId);
      if (!item) continue;

      const nextStock = Number(item.current_stock || 0) + delta;
      if (nextStock < 0) {
        return NextResponse.json(
          { error: `Not enough stock for ${item.item_name}.` },
          { status: 400 },
        );
      }
    }

    const previousStocks = new Map<string, number>();
    const updatedSupplyIds: string[] = [];

    for (const [supplyId, delta] of deltaBySupply.entries()) {
      const item = supplyMap.get(supplyId)!;
      const previousStock = Number(item.current_stock || 0);
      const nextStock = previousStock + delta;

      previousStocks.set(supplyId, previousStock);

      const { error: updateError } = await supabase
        .from("inventory_supplies")
        .update({
          current_stock: nextStock,
          last_restocked:
            movementType === "in" ? new Date().toISOString() : undefined,
        })
        .eq("id", supplyId);

      if (updateError) {
        for (const rollbackId of updatedSupplyIds) {
          await supabase
            .from("inventory_supplies")
            .update({ current_stock: previousStocks.get(rollbackId) })
            .eq("id", rollbackId);
        }
        throw updateError;
      }

      updatedSupplyIds.push(supplyId);
    }

    const purpose =
      movementType === "in" ? "Restock" : "Usage/Distribution";
    const defaultReason =
      movementType === "in" ? "Correction return" : "Room refill after cleaning";
    const recordedBy =
      user?.user_metadata?.full_name || user?.email || "Admin";
    const movementTime =
      typeof usageDate === "string" && usageDate ? usageDate : new Date().toISOString();

    const logs = parsedRows.map((row) => ({
      supply_id: row.supply_id,
      room_id: room.id,
      quantity_used: row.quantity,
      used_by: recordedBy,
      usage_date: movementTime,
      purpose,
      notes: `Room ${room.room_number} | ${defaultReason}${row.notes ? ` | ${row.notes}` : ""}`,
    }));

    const { error: insertError } = await supabase
      .from("supply_usage_logs")
      .insert(logs);

    if (insertError) {
      for (const rollbackId of updatedSupplyIds) {
        await supabase
          .from("inventory_supplies")
          .update({ current_stock: previousStocks.get(rollbackId) })
          .eq("id", rollbackId);
      }
      throw insertError;
    }

    await logAdminAction(
      supabase,
      user!.id,
      movementType === "in" ? "Room Supplies Returned" : "Room Supplies Issued",
      `Room ${room.room_number} | Items: ${parsedRows.length}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Room supplies movement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save room supplies" },
      { status: 500 },
    );
  }
}
