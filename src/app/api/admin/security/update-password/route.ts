import { authorizeAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-logger";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

// Input Validation Schema
const UpdatePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Secure Authorization Check
    const { error: authError, user } = await authorizeAdmin(supabase);
    if (authError) {
      return authError;
    }

    // 2. Parse & Validate Request Body
    const body = await request.json();
    const result = UpdatePasswordSchema.safeParse(body);

    if (!result.success) {
      // ✅ FIX: Use .issues instead of .errors to avoid TS issues
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 },
      );
    }

    const { password } = result.data;

    // 3. Update Password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Log the Security Action
    try {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || "unknown";
      const userAgent = headersList.get("user-agent") || "unknown";

      // ✅ FIX: JSON.stringify the details object so it matches the 'string' type expected by logAdminAction
      await logAdminAction(
        supabase,
        user.id,
        "Security Update",
        JSON.stringify({
          action: "Password Changed",
          ip_address: ip,
          device: userAgent,
          status: "success",
        }),
      );
    } catch (logError) {
      console.warn("Failed to log admin action:", logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
