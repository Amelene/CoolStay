import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ 
        error: "Database error", 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      role: userData?.role,
      full_name: userData?.full_name,
      raw_data: userData
    });
  } catch (error: unknown) {
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
