import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    // Use Service Role to search all users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Search in the 'users' table
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ isTaken: false });
    }

    return NextResponse.json({ isTaken: !!data });
  } catch (error) {
    console.error("Check phone error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
