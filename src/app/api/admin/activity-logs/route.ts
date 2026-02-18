import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin only
    const { error: authError } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const { data, error } = await supabase
      .from("admin_activity_logs")
      .select(
        `
        id,
        action,
        created_at,
        ip_address,
        device_info,
        users ( full_name, email, role )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100); // Limit to last 100 actions for performance

    if (error) {
      console.error("Activity logs query error:", error);
      throw error;
    }

    console.log("Activity logs fetched:", data?.length || 0, "records");
    return NextResponse.json(data || []);
  } catch (error: unknown) {
    let message = "Internal Server Error";
    if (error instanceof Error) {
      message = error.message;
      console.error("Activity logs API error:", error);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
