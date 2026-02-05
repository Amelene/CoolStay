import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";

// ✅ Fix: Use strict SupabaseClient type instead of 'any'
async function checkAuth(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return false;
  return true;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 🔒 SECURITY CHECK
    if (!(await checkAuth(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("inventory_supplies")
      .select("*")
      .order("category", { ascending: true })
      .order("item_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
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

    // 🔒 SECURITY CHECK
    if (!(await checkAuth(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        last_restocked: new Date().toISOString(),
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
