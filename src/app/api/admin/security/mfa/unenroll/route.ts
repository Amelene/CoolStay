import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createClient();

  // 1. Authorize (Must be Admin)
  const { error: authError, user } = await authorizeAdmin(supabase);
  if (authError) return authError;

  try {
    // 2. List all MFA factors
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    // 3. Unenroll (Delete) all TOTP factors
    const totpFactors = factors.totp; // Supabase separates factors by type

    // We use Promise.all to delete them in parallel if there are multiple
    const unenrollPromises = totpFactors.map((factor) =>
      supabase.auth.mfa.unenroll({ factorId: factor.id }),
    );

    await Promise.all(unenrollPromises);

    // 4. Update User Profile to reflect 2FA is OFF
    await supabase
      .from("users")
      .update({ is_two_factor_enabled: false })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unenroll Error:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 },
    );
  }
}
