import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("admin_activity_logs")
      .select(
        `
        id,
        action,
        created_at,
        ip_address,
        users ( full_name, email )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100); // Limit to last 100 actions for performance

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    let message = "Internal Server Error";
    if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
