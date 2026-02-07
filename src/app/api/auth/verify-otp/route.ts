import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();
    const supabase = await createClient();

    // 1. Verify the Email OTP (Factor 1)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Check if User has MFA Enabled
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const hasMfaEnabled = user?.factors?.some(
      (factor) => factor.status === "verified",
    );

    // 3. Routing Logic
    if (hasMfaEnabled) {
      // ✅ User has MFA: Redirect to 2FA verification first
      // We append ?return_to=/update-password so the 2FA page knows this is a recovery flow
      return NextResponse.json({
        success: true,
        redirectUrl: "/auth/verify-2fa?return_to=/update-password",
      });
    }

    // ❌ No MFA: Proceed directly to update password
    return NextResponse.json({
      success: true,
      redirectUrl: "/update-password",
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
