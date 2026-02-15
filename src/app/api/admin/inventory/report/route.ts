import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch Live Inventory
    const { data: inventory, error: fetchError } = await supabase
      .from("inventory_supplies")
      .select(
        "item_name, category, current_stock, minimum_stock, unit, cost_per_unit",
      )
      .order("category", { ascending: true });

    if (fetchError) throw fetchError;

    // 2. Prepare Snapshot Data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = inventory.map((item: any) => ({
      item_name: item.item_name,
      category: item.category,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      unit: item.unit,
    }));

    const lowStockCount = items.filter(
      (i) => i.current_stock <= i.minimum_stock,
    ).length;

    const reportSnapshot = {
      generatedAt: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      generatedBy: user.email || "Admin",
      summary: {
        totalItems: items.length,
        lowStockCount,
      },
      items,
    };

    // 3. Save to 'analytics_reports' table
    const { error: insertError } = await supabase
      .from("analytics_reports")
      .insert({
        report_type: "Inventory Stock Snapshot",
        time_range: new Date().toISOString().slice(0, 7), // YYYY-MM
        report_content: JSON.stringify(reportSnapshot),
        success: true,
        created_by: user.id,
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // ✅ Fix: Use 'unknown' and safe check
    console.error("Inventory Report Error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
