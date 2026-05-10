import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getURL } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const {
      email, full_name, role, phone,
      employee_id, first_name, middle_name, last_name,
      position, department, salary, hire_date,
    } = await req.json();

    let baseUrl = getURL();
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

    // 🔑 Service role — bypasses RLS for all DB operations.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Create auth.users + send invite email.
    // This MUST happen before the DB writes since we need the auth UUID.
    const { data, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role },
        redirectTo: `${baseUrl}/update-password`,
      });

    if (inviteError) {
      if (inviteError.status === 429) {
        return NextResponse.json(
          { error: "Email rate limit exceeded. Please try again in an hour." },
          { status: 429 }
        );
      }
      console.error("Invite Error:", inviteError.message);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const authUserId = data.user.id;

    // Step 2: Atomically create public.users + staff in one transaction.
    // onboard_staff_member() is a SECURITY DEFINER RPC that wraps both
    // inserts in a single PostgreSQL transaction — if either fails,
    // both roll back. No orphaned rows possible.
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      "onboard_staff_member",
      {
        p_auth_user_id: authUserId,
        p_full_name:    full_name,
        p_email:        email,
        p_phone:        phone ?? null,
        p_role:         role,
        p_employee_id:  employee_id,
        p_first_name:   first_name,
        p_middle_name:  middle_name ?? null,
        p_last_name:    last_name,
        p_position:     position,
        p_department:   department,
        p_salary:       salary,
        p_hire_date:    hire_date,
      }
    );

    if (rpcError) {
      console.error("Onboard RPC Error:", rpcError.message);
      // Auth user was already created — note it so admin knows
      return NextResponse.json(
        {
          error: `Invite sent but DB setup failed: ${rpcError.message}. Auth user ID: ${authUserId}`,
        },
        { status: 500 }
      );
    }

    // rpcResult = public.users.id (returned by the RPC function)
    return NextResponse.json({ user_id: rpcResult, auth_user_id: authUserId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}