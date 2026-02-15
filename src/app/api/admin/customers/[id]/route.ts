import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    // Await params for Next.js 15 compatibility
    const { id } = await params;

    // 1. Check Admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Fetch Bookings for this specific guest
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        created_at,
        check_in_date,
        check_out_date,
        total_amount,
        status,
        guests_count,
        room_types (name, image_url)
      `
      )
      .eq("guest_id", id)
      .order("check_in_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(bookings);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
