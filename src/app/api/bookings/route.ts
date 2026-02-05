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
    )
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
    // ⚠️ Note: We purposefully IGNORE 'total_price' from body for security
    const { room_type_id, check_in, check_out, adults, children, infants } =
      body;

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 1. GLOBAL CLEANUP
    await cleanupExpiredBookings(adminDb);

    // 2. Check Room Details & Get REAL PRICE from Database
    const { data: roomType, error: roomError } = await adminDb
      .from("room_types")
      .select("total_rooms, base_price, price_night") // Fetch prices
      .eq("id", room_type_id)
      .single();

    if (roomError || !roomType) throw new Error("Room type not found.");

    // 🔒 3. SERVER-SIDE PRICE CALCULATION (The Security Fix)
    const start = new Date(check_in);
    const end = new Date(check_out);
    const nights = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Fallback logic: Use nightly price if available, otherwise base_price
    const rate =
      roomType.price_night && roomType.price_night > 0
        ? roomType.price_night
        : roomType.base_price;

    const calculatedTotal = rate * nights;

    // 4. Availability Logic
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

    // 5. Create Booking with breakdown
    const { data, error: insertError } = await adminDb
      .from("bookings")
      .insert({
        guest_id: user.id,
        room_type_id,
        check_in_date: check_in,
        check_out_date: check_out,
        guests_count: (Number(adults) || 1) + (Number(children) || 0), // Legacy Sum
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        infants: Number(infants) || 0,
        total_amount: calculatedTotal, // ✅ SECURE: Uses server value
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
