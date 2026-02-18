import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ROLES, UserRole } from "./role_config";

/**
 * Flexible role-based authorization
 * @param supabase - Supabase client
 * @param allowedRoles - Array of roles that can access the resource
 * @returns Authorization result with error or user
 */
export async function authorizeRole(
  supabase: SupabaseClient,
  allowedRoles: UserRole[]
) {
  // 1. Get User
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

  // 2. 🚨 SECURITY CHECK: Enforce MFA (AAL2)
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

  // If the user *can* do MFA (nextLevel === 'aal2') but *hasn't* (currentLevel === 'aal1'), BLOCK THEM.
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

  // 3. Check User Role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
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

  // 4. Verify Role Access
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

  return { error: null, user, role: userData.role };
}

/**
 * Admin-only authorization (backward compatible)
 */
export async function authorizeAdminOnly(supabase: SupabaseClient) {
  return authorizeRole(supabase, [ROLES.ADMIN]);
}

/**
 * Admin and Front Desk authorization
 */
export async function authorizeAdminOrFrontDesk(supabase: SupabaseClient) {
  return authorizeRole(supabase, [ROLES.ADMIN, ROLES.FRONT_DESK]);
}
