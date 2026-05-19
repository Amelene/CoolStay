import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type InternalRole = "admin" | "manager" | "front_desk" | "staff";

const ROLE_PERMISSIONS: Record<InternalRole, string[]> = {
  admin: ["all"],
  manager: ["manage_operations", "reports", "inventory", "bookings"],
  front_desk: ["bookings", "billing", "customers", "inquiries"],
  staff: ["tasks", "room_status", "schedule"],
};

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function isInternalRole(role: string): role is InternalRole {
  return ["admin", "manager", "front_desk", "staff"].includes(role);
}

async function getNextEmployeeId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("generate_next_employee_id");
  if (error) throw error;
  return data;
}

// GET: Fetch all staff, or provide the next generated employee id.
export async function GET(request: Request) {
  const supabase = await createClient();

  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("nextEmployeeId") === "true") {
      const employeeId = await getNextEmployeeId(supabase);
      return NextResponse.json({ employee_id: employeeId });
    }

    const { data: staff, error } = await supabase
      .from("staff")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) throw error;

    const userIds = Array.from(
      new Set((staff || []).map((member) => member.user_id).filter(Boolean)),
    );
    const { data: users, error: usersError } =
      userIds.length > 0
        ? await supabase
            .from("users")
            .select("id, role, auth_user_id")
            .in("id", userIds)
        : { data: [], error: null };

    if (usersError) throw usersError;

    const usersById = new Map((users || []).map((user) => [user.id, user]));

    return NextResponse.json(
      (staff || []).map((member) => {
        const linkedUser = usersById.get(member.user_id);
        return {
          ...member,
          system_role: linkedUser?.role || "staff",
          auth_user_id: linkedUser?.auth_user_id || null,
        };
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Direct staff insert fallback. Main onboarding uses /api/admin/invite.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("staff")
      .insert([
        {
          user_id: body.user_id || null,
          employee_id: body.employee_id,
          first_name: body.first_name,
          last_name: body.last_name,
          middle_name: body.middle_name || null,
          email: body.email,
          phone: body.phone,
          position: body.position,
          department: body.department,
          status: body.status || "active",
          hire_date: body.hire_date || new Date().toISOString(),
          salary: body.salary || 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update staff details plus linked public user role/profile.
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      id,
      user_id,
      role,
      full_name,
      email,
      phone,
      employee_id,
      first_name,
      middle_name,
      last_name,
      position,
      department,
      salary,
      hire_date,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Staff ID required" }, { status: 400 });
    }
    if (!isInternalRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: existingStaff, error: existingError } = await supabase
      .from("staff")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (existingError || !existingStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const linkedUserId = user_id || existingStaff.user_id;

    const { data: updatedStaff, error: staffError } = await supabase
      .from("staff")
      .update({
        employee_id,
        first_name,
        middle_name: middle_name || null,
        last_name,
        email,
        phone,
        position,
        department,
        salary,
        hire_date,
        status: status || "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (staffError) throw staffError;

    if (linkedUserId) {
      const { data: updatedUser, error: userError } = await supabase
        .from("users")
        .update({
          full_name,
          email,
          phone,
          role,
          is_admin: role === "admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkedUserId)
        .select("id, auth_user_id")
        .single();

      if (userError) throw userError;

      const authUserId = updatedUser?.auth_user_id;
      if (authUserId) {
        const admin = serviceClient();

        const { error: authUpdateError } =
          await admin.auth.admin.updateUserById(authUserId, {
            email,
            user_metadata: { full_name, role },
            app_metadata: { role },
          });

        if (authUpdateError) throw authUpdateError;

        const { error: adminUserError } = await admin
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
      }
    }

    return NextResponse.json(updatedStaff);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove staff member
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase.from("staff").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
