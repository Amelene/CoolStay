import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ROLES, ALL_STAFF_ROLES } from "./role_config";

/**
 * Authorizes any internal staff member (admin, manager, front_desk, staff).
 * Uses auth_user_id for the role lookup, not the table's own auto-generated id.
 */
export async function authorizeAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  // MFA enforcement
  const { data: mfaData, error: mfaError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (mfaError) {
    return {
      error: NextResponse.json(
        { error: "Failed to verify security level" },
        { status: 500 }
      ),
      user: null,
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
    };
  }

  // Look up role via auth_user_id (the FK to auth.users)
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
    };
  }

  // Allow any internal staff role
  if (!ALL_STAFF_ROLES.includes(userData.role as typeof ROLES[keyof typeof ROLES])) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Staff access required" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user, role: userData.role };
}
