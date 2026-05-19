import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type InternalRole = "admin" | "manager" | "front_desk" | "staff";

const ROLE_PERMISSIONS: Record<InternalRole, string[]> = {
  admin: ["all"],
  manager: ["manage_operations", "reports", "inventory", "bookings"],
  front_desk: ["bookings", "billing", "customers", "inquiries"],
  staff: ["tasks", "room_status", "schedule"],
};

function isInternalRole(role: string): role is InternalRole {
  return ["admin", "manager", "front_desk", "staff"].includes(role);
}

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let authUserId: string | null = null;

  try {
    const {
      email,
      full_name,
      role,
      phone,
      employee_id,
      first_name,
      middle_name,
      last_name,
      position,
      department,
      salary,
      hire_date,
    } = await req.json();

    if (!isInternalRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const origin = req.headers.get("origin");
    const host = req.headers.get("host") ?? "";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const baseUrl = origin ?? `${proto}://${host}`;

    const { data, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role },
        redirectTo: `${baseUrl}/update-password`,
      });

    if (inviteError) {
      if (inviteError.status === 429) {
        return NextResponse.json(
          { error: "Email rate limit exceeded. Please try again in an hour." },
          { status: 429 },
        );
      }

      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    authUserId = data.user.id;

    const { data: publicUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_user_id: authUserId,
        email,
        full_name,
        phone: phone ?? null,
        role,
        is_admin: role === "admin",
      })
      .select("id")
      .single();

    if (userError) throw userError;

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        user_id: publicUser.id,
        employee_id,
        email,
        phone,
        first_name,
        middle_name: middle_name ?? null,
        last_name,
        position,
        department,
        salary,
        hire_date,
        status: "active",
      })
      .select("id")
      .single();

    if (staffError) throw staffError;

    const { error: adminUserError } = await supabaseAdmin
      .from("admin_users")
      .upsert(
        {
          id: authUserId,
          role,
          permissions: ROLE_PERMISSIONS[role],
        },
        { onConflict: "id" },
      );

    if (adminUserError) throw adminUserError;

    return NextResponse.json({
      user_id: publicUser.id,
      auth_user_id: authUserId,
      staff_id: staff.id,
    });
  } catch (error: unknown) {
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }

    const msg = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
