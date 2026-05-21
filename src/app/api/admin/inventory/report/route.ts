import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const INVENTORY_SNAPSHOT_TYPE = "Inventory Snapshot";

const buildInventorySnapshot = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  generatedBy: string,
) => {
  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory_supplies")
    .select("id, item_name, category, current_stock, minimum_stock, unit")
    .is("archived_at", null)
    .order("category", { ascending: true })
    .order("item_name", { ascending: true });

  if (inventoryError) throw inventoryError;

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

    if (log.purpose === "Restock") current.stock_in += quantity;
    else current.stock_out += quantity;

    movementBySupply.set(log.supply_id, current);
  });

  const items = (inventory || []).map((item) => ({
    item_name: item.item_name,
    category: item.category,
    current_stock: item.current_stock,
    minimum_stock: item.minimum_stock,
    unit: item.unit,
    ...(movementBySupply.get(item.id) || { stock_in: 0, stock_out: 0 }),
  }));

  return {
    generatedAt: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    generatedBy,
    summary: {
      totalItems: items.length,
      lowStockCount: items.filter(
        (item) => item.current_stock <= item.minimum_stock,
      ).length,
      totalStockIn: items.reduce((sum, item) => sum + item.stock_in, 0),
      totalStockOut: items.reduce((sum, item) => sum + item.stock_out, 0),
    },
    items,
  };
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { error: authError } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const { data, error } = await supabase
      .from("analytics_reports")
      .select("id, generated_at, report_content")
      .eq("report_type", INVENTORY_SNAPSHOT_TYPE)
      .order("generated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();

    const { error: authError, user } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const reportSnapshot = await buildInventorySnapshot(
      supabase,
      user?.email || "Admin",
    );

    const { error: insertError } = await supabase
      .from("analytics_reports")
      .insert({
        report_type: INVENTORY_SNAPSHOT_TYPE,
        time_range: new Date().toISOString().slice(0, 7),
        report_content: JSON.stringify(reportSnapshot),
        success: true,
        created_by: user?.id,
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // ✅ Fix: Use 'unknown' and safe check
    console.error("Inventory Report Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
