import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { authorizeAdmin } from "@/lib/admin-auth";

// Create a separate ADMIN client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    // 1. Security Check: Ensure requester is an actual Admin
    const supabase = await createServerClient();
    const { error: authError, user } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const { data: requesterProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can invite staff" },
        { status: 403 },
      );
    }

    // 2. Process Request
    const body = await request.json();
    const { email, role, fullName } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and Role are required" },
        { status: 400 },
      );
    }

    // 3. Send Invite via Supabase Auth
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role,
          full_name: fullName,
        },
        // ✅ FIX: Redirect DIRECTLY to the page (Client-side will handle the #hash token)
        redirectTo: `${new URL(request.url).origin}/update-password`,
      });

    if (inviteError) throw inviteError;

    // 4. Update the public.users table immediately
    if (inviteData.user) {
      await supabaseAdmin
        .from("users")
        .update({
          role: role,
          full_name: fullName,
        })
        .eq("id", inviteData.user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent",
      user_id: inviteData.user?.id,
    });
  } catch (error: unknown) {
    let message = "Internal Server Error";
    if (error instanceof Error) message = error.message;
    console.error("Invite Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
