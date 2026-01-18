import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // 1. Check User Session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch Bookings
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      room_types (
        name,
        image_url
      )
    `,
    )
    .eq("guest_id", user.id)
    .order("check_in_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings });
}

// POST Method
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to book." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { room_type_id, check_in, check_out, guests, total_price } = body;

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: roomType, error: roomError } = await adminDb
      .from("room_types")
      .select("total_rooms")
      .eq("id", room_type_id)
      .single();

    if (roomError || !roomType) throw new Error("Room type not found.");

    // ✅ FIX: Enhanced Overlap Logic for Option A (Block Whole Date)
    // We treat any booking as blocking the "Date".
    // 1. If check_in == check_out (Day Tour), effective range is [T, T+1) for overlap check.
    // 2. We use Supabase JS processing because the raw query is limited for this mixed logic.

    // Fetch ALL active bookings for this room type that touch the requested range
    // Broad search: Anything starting before we leave AND ending after we arrive.
    // For safety, we extend the search window by 1 day on both sides.
    const searchStart = check_in;
    const searchEnd =
      check_out === check_in
        ? new Date(new Date(check_out).getTime() + 86400000)
            .toISOString()
            .split("T")[0]
        : check_out;

    const { data: existingBookings, error: fetchError } = await adminDb
      .from("bookings")
      .select("check_in_date, check_out_date")
      .eq("room_type_id", room_type_id)
      .in("status", ["confirmed", "pending", "checked_in"])
      // Overlap Query: (StartA <= EndB) AND (EndA >= StartB)
      .lte("check_in_date", searchEnd)
      .gte("check_out_date", searchStart);

    if (fetchError) throw fetchError;

    // Manual JS Filter to be precise about "Same Day" blocking
    const overlapCount =
      existingBookings?.filter((b) => {
        const bStart = b.check_in_date;
        // If existing is Day Tour (Start==End), treat end as Start + 1 for blocking logic
        const bEnd =
          b.check_in_date === b.check_out_date
            ? new Date(new Date(b.check_in_date).getTime() + 86400000)
                .toISOString()
                .split("T")[0]
            : b.check_out_date;

        const newStart = check_in;
        const newEnd = searchEnd; // Already adjusted above if it was a day tour

        // Standard Overlap: StartA < EndB && EndA > StartB
        return bStart < newEnd && bEnd > newStart;
      }).length || 0;

    const capacity = roomType.total_rooms;

    if (overlapCount >= capacity) {
      return NextResponse.json(
        {
          error: `Fully booked! Only ${capacity} rooms exist and ${overlapCount} are taken.`,
        },
        { status: 409 },
      );
    }

    // Create Booking
    const { data, error: insertError } = await adminDb
      .from("bookings")
      .insert({
        guest_id: user.id,
        room_type_id,
        check_in_date: check_in,
        check_out_date: check_out, // We store original dates (e.g. Jan 1 - Jan 1)
        guests_count: guests,
        total_amount: total_price,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, booking: data });
  } catch (error: unknown) {
    console.error("Booking Error:", error);
    let errorMessage = "Internal Server Error";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
