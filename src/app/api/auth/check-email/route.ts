// src/app/api/auth/check-email/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // 1. Validate input
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // 2. Initialize Supabase Admin Client
    // We need the SERVICE_ROLE_KEY to search users (regular anon key cannot list users)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Search for the user in the 'users' table (your public profile table)
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      // If table doesn't exist or other DB error, log it but don't crash UI
      console.error("Supabase error:", error);
      return NextResponse.json({ isTaken: false });
    }

    // 4. Return availability
    return NextResponse.json({ isTaken: !!data });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
