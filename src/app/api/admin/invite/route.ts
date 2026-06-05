import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

type ErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
  status?: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const { message, details, hint } = error as ErrorLike;
    return [message, details, hint].filter(Boolean).join(" ") || "Internal Error";
  }

  return "Internal Error";
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return 500;

  const { code, status } = error as ErrorLike;
  if (typeof status === "number") return status;
  if (code === "23505") return 409;
  if (code === "23503" || code === "23514" || code === "23502") return 400;

  return 500;
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let authUserId: string | null = null;
  let publicUserId: string | null = null;
  let staffId: number | null = null;

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

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, role")
      .eq("email", email)
      .maybeSingle();

    if (existingUserError) throw existingUserError;
    if (existingUser) {
      const { data: linkedStaff, error: linkedStaffError } =
        await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("user_id", existingUser.id)
          .limit(1);

      if (linkedStaffError) throw linkedStaffError;

      const isInternalOrphan =
        typeof existingUser.role === "string" &&
        isInternalRole(existingUser.role) &&
        existingUser.auth_user_id &&
        !linkedStaff?.length;

      if (isInternalOrphan) {
        const { data: authLookup, error: authLookupError } =
          await supabaseAdmin.auth.admin.getUserById(existingUser.auth_user_id);
        const authUserMissing =
          !authLookup?.user ||
          authLookupError?.status === 404 ||
          /not found/i.test(authLookupError?.message ?? "");

        if (authLookupError && !authUserMissing) throw authLookupError;

        if (authUserMissing) {
          const { error: cleanupError } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("id", existingUser.id);

          if (cleanupError) throw cleanupError;
        }
      }

      if (!isInternalOrphan) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 },
        );
      }

      const { data: staleUserStillExists, error: staleCheckError } =
        await supabaseAdmin
          .from("users")
          .select("id")
          .eq("id", existingUser.id)
          .maybeSingle();

      if (staleCheckError) throw staleCheckError;
      if (staleUserStillExists) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 },
        );
      }
    }

    const { data: existingStaff, error: existingStaffError } =
      await supabaseAdmin
        .from("staff")
        .select("id, email, employee_id")
        .or(`email.eq.${email},employee_id.eq.${employee_id}`)
        .limit(1);

    if (existingStaffError) throw existingStaffError;
    const existingStaffMember = existingStaff?.[0];
    if (existingStaffMember) {
      const isEmailMatch = existingStaffMember.email === email;
      return NextResponse.json(
        {
          error: isEmailMatch
            ? "A staff member with this email already exists."
            : "A staff member with this employee ID already exists.",
        },
        { status: 409 },
      );
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

    const profileData = {
      auth_user_id: authUserId,
      email,
      full_name,
      phone: phone ?? null,
      role,
      is_admin: role === "admin",
      updated_at: new Date().toISOString(),
    };

    const { data: authLinkedUser, error: authLinkedUserError } =
      await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

    if (authLinkedUserError) throw authLinkedUserError;

    const { data: publicUser, error: userError } = authLinkedUser
      ? await supabaseAdmin
          .from("users")
          .update(profileData)
          .eq("id", authLinkedUser.id)
          .select("id")
          .single()
      : await supabaseAdmin
          .from("users")
          .upsert(profileData, { onConflict: "email" })
          .select("id")
          .single();

    if (userError) throw userError;
    publicUserId = publicUser.id;

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
    staffId = staff.id;

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
    console.error("Staff invite failed:", error);

    if (staffId) {
      await supabaseAdmin.from("staff").delete().eq("id", staffId);
    }

    if (publicUserId) {
      await supabaseAdmin.from("users").delete().eq("id", publicUserId);
    } else if (authUserId) {
      await supabaseAdmin.from("users").delete().eq("auth_user_id", authUserId);
    }

    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) },
    );
  }
}
