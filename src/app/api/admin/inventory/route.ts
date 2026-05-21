import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { error: authError } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const { data, error } = await supabase
      .from("inventory_supplies")
      .select("*")
      .is("archived_at", null)
      .order("category", { ascending: true })
      .order("item_name", { ascending: true });

    if (error) throw error;

    const { data: logs, error: logsError } = await supabase
      .from("supply_usage_logs")
      .select("supply_id, purpose, quantity_used");

    if (logsError) throw logsError;

    const movementBySupply = new Map<
      string,
      { stock_in: number; stock_out: number }
    >();

    logs?.forEach((log) => {
      const current = movementBySupply.get(log.supply_id) || {
        stock_in: 0,
        stock_out: 0,
      };
      const quantity = Number(log.quantity_used || 0);

      if (log.purpose === "Restock") {
        current.stock_in += quantity;
      } else {
        current.stock_out += quantity;
      }

      movementBySupply.set(log.supply_id, current);
    });

    return NextResponse.json(
      (data || []).map((item) => ({
        ...item,
        ...(movementBySupply.get(item.id) || { stock_in: 0, stock_out: 0 }),
      })),
    );
  } catch (error: unknown) {
    // ✅ Fix: Use 'unknown' and safely access message
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { error: authError } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const body = await request.json();
    const { item_name, category, min_stock, unit, cost } = body;

    const { data, error } = await supabase
      .from("inventory_supplies")
      .insert({
        item_name,
        category,
        minimum_stock: min_stock || 10,
        current_stock: 0,
        unit: unit || "pcs",
        cost_per_unit: cost || 0,
        last_restocked: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    // ✅ Fix: Use 'unknown' and safely access message
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
