import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function authorizeAdmin(supabase: SupabaseClient) {
  // 1. Get User
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  // 2. 🚨 SECURITY CHECK: Enforce MFA (AAL2)
  // Check the current assurance level of the session
  const { data: mfaData, error: mfaError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (mfaError) {
    return {
      error: NextResponse.json(
        { error: "Failed to verify security level" },
        { status: 500 },
      ),
      user: null,
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
        { status: 403 },
      ),
      user: null,
    };
  }

  // 3. Check if Admin
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Admins Only" },
        { status: 403 },
      ),
      user: null,
    };
  }

  return { error: null, user };
}
