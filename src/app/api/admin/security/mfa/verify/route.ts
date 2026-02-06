import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const VerifySchema = z.object({
  factorId: z.string(),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Authorize
  const { error: authError } = await authorizeAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const { factorId, code } = VerifySchema.parse(body);

  // 2. Create a Challenge (Standard Supabase MFA flow)
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    return NextResponse.json(
      { error: challengeError.message },
      { status: 500 },
    );
  }

  // 3. Verify the Code against the Challenge
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 });
  }

  // 4. Update the User Table to reflect 2FA is ON (For UI purposes)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("users")
      .update({ is_two_factor_enabled: true })
      .eq("id", user.id);
  }

  return NextResponse.json({ success: true });
}
