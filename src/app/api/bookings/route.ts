import { createClient } from "@/lib/supabase/server";
import {
  createClient as createAdminClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// --- HELPER: Auto-Cleanup Logic ---
async function cleanupExpiredBookings(
  adminDb: SupabaseClient,
  userId?: string,
) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Query: Find pending bookings where check-in is strictly BEFORE today
  let query = adminDb
    .from("bookings")
    .update({
      status: "cancelled",
      special_requests: "System: Auto-cancelled due to non-payment.",
    })
    .eq("status", "pending")
    .neq("payment_status", "paid")
    .lt("check_in_date", today);

  if (userId) {
    query = query.eq("guest_id", userId);
  }

  const { error } = await query;
  if (error) console.error("Auto-cleanup error:", error);
}

// GET Method (User Dashboard)
export async function GET() {
  const supabase = await createClient();

  // 1. Check User Session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. TRIGGER CLEANUP (Using Admin Client)
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await cleanupExpiredBookings(adminDb, user.id);

  // 3. Fetch Fresh Data (INCLUDING PAYMENTS)
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      room_types (
        id,
        name,
        image_url
      ),
      payments (*) 
    `,
    ) // ✅ Added payments relation
    .eq("guest_id", user.id)
    .order("check_in_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings });
}

// POST Method (New Booking)
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

    // 1. GLOBAL CLEANUP: Free up rooms before checking availability
    await cleanupExpiredBookings(adminDb);

    // 2. Check Room Details
    const { data: roomType, error: roomError } = await adminDb
      .from("room_types")
      .select("total_rooms")
      .eq("id", room_type_id)
      .single();

    if (roomError || !roomType) throw new Error("Room type not found.");

    // 3. Availability Logic
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
      .lte("check_in_date", searchEnd)
      .gte("check_out_date", searchStart);

    if (fetchError) throw fetchError;

    // Filter Overlaps
    const overlapCount =
      existingBookings?.filter((b) => {
        const bStart = b.check_in_date;
        const bEnd =
          b.check_in_date === b.check_out_date
            ? new Date(new Date(b.check_in_date).getTime() + 86400000)
                .toISOString()
                .split("T")[0]
            : b.check_out_date;
        return bStart < searchEnd && bEnd > searchStart;
      }).length || 0;

    if (overlapCount >= roomType.total_rooms) {
      return NextResponse.json(
        { error: `Fully booked! Only ${roomType.total_rooms} rooms exist.` },
        { status: 409 },
      );
    }

    // 4. Create Booking
    const { data, error: insertError } = await adminDb
      .from("bookings")
      .insert({
        guest_id: user.id,
        room_type_id,
        check_in_date: check_in,
        check_out_date: check_out,
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
    const msg =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
