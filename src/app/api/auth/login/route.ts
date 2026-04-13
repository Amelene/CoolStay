import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-logger";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const supabase = await createClient();

    // 1. Attempt Basic Login (AAL1)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || "Invalid login credentials" },
        { status: 401 },
      );
    }

    // 2. Fetch User Profile & Settings
    const { data: profile } = await supabase
      .from("users")
      .select("role, full_name, is_two_factor_enabled")
      .eq("id", user.id)
      .single();

    // 3. 2FA Check Enforcement
    if (profile?.is_two_factor_enabled) {
      // Redirect to the verification page
      return NextResponse.json({ redirectUrl: "/auth/verify-2fa" });
    }

    // 4. Standard Login Success Logging (Only if no 2FA or 2FA not enabled)
    await logAdminAction(
      supabase,
      user.id,
      "User Login",
      `Role: ${profile?.role}`,
    );

    const redirectUrl =
      profile?.role === "admin" ? "/admin/dashboard" : "/dashboard";

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
