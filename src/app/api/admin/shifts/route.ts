import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let query = supabase.from("shifts").select("*");

    // If a date range is provided, filter by it
    if (start && end) {
      query = query.gte("shift_date", start).lte("shift_date", end);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    // Safely log the unknown error type
    console.error(
      "Shifts GET Error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const body = await req.json();
    const { staff_id, shift_date, shift_type } = body;

    if (!staff_id || !shift_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. CLEAR: Prevent duplicates by deleting any existing shift for this staff on this date
    await supabase.from("shifts").delete().match({ staff_id, shift_date });

    // 2. OFF DAY: If they selected "off", we leave it deleted and return early
    if (shift_type === "off" || !shift_type) {
      return NextResponse.json({ success: true, message: "Shift cleared" });
    }

    // 3. TIMES: Auto-assign standard operating hours based on the shift type
    let start_time = "09:00:00";
    let end_time = "17:00:00";

    if (shift_type === "morning") {
      start_time = "06:00:00";
      end_time = "14:00:00";
    } else if (shift_type === "mid") {
      start_time = "14:00:00";
      end_time = "22:00:00";
    } else if (shift_type === "night") {
      start_time = "22:00:00";
      end_time = "06:00:00"; // Note: Spans past midnight, but time column holds it safely
    }

    // 4. INSERT: Save the new shift
    const { data, error } = await supabase
      .from("shifts")
      .insert({
        staff_id,
        shift_date,
        shift_type,
        start_time,
        end_time,
        status: "scheduled",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    // Safely log the unknown error type
    console.error(
      "Shifts POST Error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 },
    );
  }
}
