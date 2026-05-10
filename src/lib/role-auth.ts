import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ROLES, UserRole, ALL_STAFF_ROLES } from "./role_config";

/**
 * Flexible role-based authorization.
 * Always looks up the role via auth_user_id (the FK to auth.users).
 */
export async function authorizeRole(
  supabase: SupabaseClient,
  allowedRoles: UserRole[]
) {
  // 1. Get authenticated user from session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      role: null,
    };
  }

  // 2. MFA enforcement — block aal1 users that have aal2 enrolled
  const { data: mfaData, error: mfaError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (mfaError) {
    return {
      error: NextResponse.json(
        { error: "Failed to verify security level" },
        { status: 500 }
      ),
      user: null,
      role: null,
    };
  }

  if (
    mfaData &&
    mfaData.currentLevel === "aal1" &&
    mfaData.nextLevel === "aal2"
  ) {
    return {
      error: NextResponse.json(
        { error: "Security Check Required: Please complete 2FA" },
        { status: 403 }
      ),
      user: null,
      role: null,
    };
  }

  // 3. Look up role via auth_user_id (NOT the table's own auto-generated id)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (userError || !userData) {
    return {
      error: NextResponse.json(
        { error: "Failed to verify user role" },
        { status: 500 }
      ),
      user: null,
      role: null,
    };
  }

  // 4. Check role is in the allowed list
  if (!allowedRoles.includes(userData.role as UserRole)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      ),
      user: null,
      role: userData.role,
    };
  }

  return { error: null, user, role: userData.role as UserRole };
}


export async function authorizeAdminOnly(supabase: SupabaseClient) {
  return authorizeRole(supabase, [
    ROLES.ADMIN,
    "super_admin" as UserRole,
    "administrator" as UserRole,
  ]);
}

/** Admin + Manager */
export async function authorizeAdminOrManager(supabase: SupabaseClient) {
  return authorizeRole(supabase, [ROLES.ADMIN, ROLES.MANAGER]);
}

/** Admin + Manager + Front Desk */
export async function authorizeAdminOrFrontDesk(supabase: SupabaseClient) {
  return authorizeRole(supabase, [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK]);
}

/** Any authenticated staff member (admin, manager, front_desk, staff) */
export async function authorizeAnyStaff(supabase: SupabaseClient) {
  return authorizeRole(supabase, ALL_STAFF_ROLES);
}
