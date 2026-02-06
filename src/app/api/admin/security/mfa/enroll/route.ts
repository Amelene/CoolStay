import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();

  // 1. Authorize Admin
  const { error: authError, user } = await authorizeAdmin(supabase);
  if (authError) return authError;

  // 2. CLEANUP: Check if user already has factors and delete them
  // This prevents the "A factor with friendly name... already exists" error
  const {
    data: { user: currentUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (currentUser?.factors && currentUser.factors.length > 0) {
    const totpFactors = currentUser.factors.filter(
      (f) => f.factor_type === "totp",
    );

    for (const factor of totpFactors) {
      // Unenroll (delete) the old/incomplete factor
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  // 3. Start New Enrollment (Safe to do now)
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CoolStay Admin", // Optional: Gives it a nice name in their app
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. Return the new QR Code
  return NextResponse.json({
    id: data.id,
    type: data.type,
    totp: data.totp,
  });
}
