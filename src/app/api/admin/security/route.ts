import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { error: authError, user } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  // 1. Fetch User Details from 'users' table
  const { data: userDetails } = await supabase
    .from("users")
    .select("full_name, email, role, is_two_factor_enabled")
    .eq("id", user.id)
    .single();

  // 2. Fetch Activity Logs (Increased limit for pagination)
  const { data: logs } = await supabase
    .from("admin_activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50); //

  return NextResponse.json({
    profile: userDetails,
    logs: logs || [],
  });
}
