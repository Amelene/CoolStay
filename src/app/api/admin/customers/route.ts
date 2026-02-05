import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const supabase = await createClient();

    // 🔒 SECURITY CHECK
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const { data, error } = await supabase
      .from("users") // Assuming 'users' table holds customer profiles
      .select("id, email, full_name, phone, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
