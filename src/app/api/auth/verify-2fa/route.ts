import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const VerifySchema = z.object({
  code: z.string().min(6, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get the current "partial" session (AAL1)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find the TOTP factor for this user
    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return NextResponse.json(
        { error: "Failed to load factors" },
        { status: 500 },
      );
    }

    // Get the first verified TOTP factor
    const totpFactor = factors.totp.find((f) => f.status === "verified");

    if (!totpFactor) {
      return NextResponse.json(
        { error: "No 2FA factor found" },
        { status: 400 },
      );
    }

    // 3. Challenge and Verify
    const body = await request.json();
    const { code } = VerifySchema.parse(body);

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

    if (challengeError) {
      return NextResponse.json(
        { error: challengeError.message },
        { status: 500 },
      );
    }

    // Fix: We don't need to store 'verifyData' since we don't use it.
    // We just check for 'error'.
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code: code,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 },
      );
    }

    // Success! The session is now upgraded to AAL2 on the server side
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA Verify Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
