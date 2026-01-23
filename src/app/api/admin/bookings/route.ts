import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch all bookings
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        users (full_name, email, phone),
        room_types (name),
        payments (id, amount, status, proof_url, payment_method, created_at, description)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    // ✅ Fix: Log the error so it is "used"
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

// PATCH: Update Status
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, status } = body;

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("check_in_date, status")
      .eq("id", id)
      .single();

    if (fetchError || !booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (status === "checked_in") {
      const checkInDate = new Date(booking.check_in_date);
      const today = new Date();
      checkInDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (today < checkInDate) {
        return NextResponse.json(
          {
            error: `Cannot check in yet. Scheduled for ${booking.check_in_date}`,
          },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Update Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}

// POST: Create Booking (FIXED GUEST COUNTS)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // ✅ Destructure new fields
    const {
      room_type_id,
      check_in_date,
      check_out_date,
      adults,
      children,
      infants,
      total_amount,
      special_requests,
    } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Calculate total guests for capacity check (Adults + Children)
    const guests_count = (Number(adults) || 1) + (Number(children) || 0);

    // Availability Check
    const { count: conflictCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("room_type_id", room_type_id)
      .neq("status", "cancelled")
      .lt("check_in_date", check_out_date)
      .gt("check_out_date", check_in_date);

    const { data: roomType } = await supabase
      .from("room_types")
      .select("total_rooms")
      .eq("id", room_type_id)
      .single();

    if ((conflictCount || 0) >= (roomType?.total_rooms || 0)) {
      return NextResponse.json(
        { error: "Room is fully booked" },
        { status: 400 },
      );
    }

    // ✅ Insert with specific counts
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        guest_id: user.id, // Admin created
        room_type_id,
        check_in_date,
        check_out_date,
        guests_count,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        infants: Number(infants) || 0,
        total_amount,
        special_requests,
        status: "confirmed",
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Booking Creation Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}
