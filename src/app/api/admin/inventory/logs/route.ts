import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Fetch logs with joins to get Item Name and Room Number
  const { data: logs, error } = await supabase
    .from("supply_usage_logs")
    .select(
      `
      *,
      inventory_supplies (item_name, unit),
      room_inventory (room_number)
    `,
    )
    .order("usage_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(logs);
}
