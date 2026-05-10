import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeRole } from "@/lib/role-auth";
import { ALL_STAFF_ROLES } from "@/lib/role_config";

export const dynamic = "force-dynamic";

/** Service-role client — bypasses RLS for staff/shifts lookups. */
const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeRole(supabase, ALL_STAFF_ROLES);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().split("T")[0];
    const to   = searchParams.get("to")   ?? new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const admin = getAdmin();

    // Step 1: auth UID → public.users.id
    const { data: profile, error: profileErr } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", user!.id)
      .single();

    if (profileErr || !profile) {
      console.error("Schedule GET: profile lookup failed", profileErr?.message);
      return NextResponse.json(
        { error: "Staff profile not found. Make sure your account is fully set up." },
        { status: 404 }
      );
    }

    // Step 2: public.users.id → staff record
    const { data: staffRecord, error: staffErr } = await admin
      .from("staff")
      .select("id, first_name, last_name, position")
      .eq("user_id", profile.id)
      .single();

    if (staffErr || !staffRecord) {
      console.error("Schedule GET: staff record lookup failed", staffErr?.message);
      return NextResponse.json(
        { error: "Staff record not found. Contact your administrator." },
        { status: 404 }
      );
    }

    // Step 3: fetch shifts for this staff member
    const { data: shifts, error: shiftsErr } = await admin
      .from("shifts")
      .select("*")
      .eq("staff_id", staffRecord.id)
      .gte("shift_date", from)
      .lte("shift_date", to)
      .order("shift_date", { ascending: true });

    if (shiftsErr) throw shiftsErr;

    return NextResponse.json({
      staff: {
        id: staffRecord.id,
        name: `${staffRecord.first_name} ${staffRecord.last_name}`,
        position: staffRecord.position,
      },
      shifts: shifts || [],
    });
  } catch (err: unknown) {
    console.error("Schedule API Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
