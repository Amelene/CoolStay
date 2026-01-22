import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-logger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supply_id, type, quantity, notes, room_id } = await request.json();

    // 1. Get Current Item
    const { data: item, error: fetchError } = await supabase
      .from("inventory_supplies")
      .select("current_stock, item_name")
      .eq("id", supply_id)
      .single();

    if (fetchError || !item) throw new Error("Item not found");

    const qty = Number(quantity);
    let newStock = item.current_stock;

    // 2. Calculate New Stock
    if (type === "restock") {
      newStock += qty;
    } else if (type === "usage") {
      newStock -= qty;
      if (newStock < 0) {
        return NextResponse.json(
          { error: "Insufficient stock" },
          { status: 400 },
        );
      }
    }

    // 3. Update Inventory Table
    const { error: updateError } = await supabase
      .from("inventory_supplies")
      .update({
        current_stock: newStock,
        last_restocked:
          type === "restock" ? new Date().toISOString() : undefined,
      })
      .eq("id", supply_id);

    if (updateError) throw updateError;

    // 4. ✅ LOG EVERYTHING (IN & OUT)
    // We use 'supply_usage_logs' as our central ledger.
    // For Restock: room_id is null, quantity_used is the amount added.
    await supabase.from("supply_usage_logs").insert({
      supply_id,
      room_id: type === "usage" ? room_id || null : null, // Only link room if used
      quantity_used: qty,
      used_by: user.user_metadata?.full_name || user.email || "Admin",
      usage_date: new Date().toISOString(),
      purpose: type === "restock" ? "Restock" : "Usage/Distribution",
      notes: notes, // Mandatory in UI now
    });

    // 5. Admin Audit Log
    await logAdminAction(
      supabase,
      user.id,
      type === "restock" ? "Restocked Inventory" : "Distributed Inventory",
      `Item: ${item.item_name} | Qty: ${qty} | Room: ${room_id || "N/A"}`,
    );

    return NextResponse.json({ success: true, new_stock: newStock });
  } catch (error: unknown) {
    let message = "Internal Server Error";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
