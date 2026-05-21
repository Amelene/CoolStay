import { createClient } from "@/lib/supabase/server";
import { authorizeAdminOnly } from "@/lib/role-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const supplyId = searchParams.get("supply_id");
  const ascending = searchParams.get("order") === "asc";

  let query = supabase
    .from("supply_usage_logs")
    .select(
      `
      *,
      inventory_supplies (item_name, unit),
      room_inventory (room_number)
    `,
    )
    .order("usage_date", { ascending });

  if (supplyId) query = query.eq("supply_id", supplyId);

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(logs);
}
