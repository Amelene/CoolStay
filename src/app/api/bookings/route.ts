import { sendBookingConfirmationEmailWithRetry } from "@/lib/email-service";
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
  const today = new Date().toISOString().split("T")[0];

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await cleanupExpiredBookings(adminDb, user.id);

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
    // ⚠️ We purposefully IGNORE 'total_price' from body for security
    const {
      room_type_id,
      check_in,
      check_out,
      adults,
      children,
      infants,
      seniors,
      pwds,
      discounts,
    } = body;

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 1. GLOBAL CLEANUP
    await cleanupExpiredBookings(adminDb);

    // 2. Check Room Details & Get REAL PRICE & CAPACITY from Database
    const { data: roomType, error: roomError } = await adminDb
      .from("room_types")
      // Ensure we select 'capacity' to validate headcount
      .select(
        "total_rooms, base_price, price_day, price_night, price_overnight, capacity",
      )
      .eq("id", room_type_id)
      .single();

    if (roomError || !roomType) throw new Error("Room type not found.");

    // 🔒 BACKEND CAPACITY VALIDATION
    const numAdults = Number(adults) || 1;
    const numChildren = Number(children) || 0;
    const numInfants = Number(infants) || 0;
    const numSeniors = Number(seniors) || 0;
    const numPwds = Number(pwds) || 0;

    const totalHeadcount = numAdults + numChildren + numSeniors + numPwds;

    const maxCapacity = roomType.capacity || 2;

    if (totalHeadcount > maxCapacity) {
      return NextResponse.json(
        { error: `Maximum capacity of ${maxCapacity} guests exceeded.` },
        { status: 400 },
      );
    }

    // 3. SERVER-SIDE PRICE CALCULATION
    const start = new Date(check_in);
    const end = new Date(check_out);
    const nights = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );

    // Determine rate based on stay type
    let baseRate: number;
    if (check_in === check_out) {
      baseRate =
        roomType.price_day && roomType.price_day > 0
          ? roomType.price_day
          : roomType.price_night && roomType.price_night > 0
            ? roomType.price_night
            : roomType.base_price;
    } else {
      baseRate =
        roomType.price_overnight && roomType.price_overnight > 0
          ? roomType.price_overnight
          : roomType.price_night && roomType.price_night > 0
            ? roomType.price_night
            : roomType.base_price;
    }

    const baseTotalAmount = baseRate * nights;

    // 🔒 SERVER-SIDE DISCOUNT CALCULATION (The "No Stacking" Rule)
    const { promo_code } = body; // Extract from body

    let seniorPwdDiscount = 0;
    if (totalHeadcount > 0 && (numSeniors > 0 || numPwds > 0)) {
      const perPaxRate = baseTotalAmount / totalHeadcount;
      const eligibleShare = perPaxRate * (numSeniors + numPwds);
      seniorPwdDiscount = eligibleShare * 0.2;
    }

    let marketingDiscount = 0;
    let appliedPromoId = null;

    // Verify promo backend-side again for security
    if (promo_code) {
      const { data: promo } = await adminDb
        .from("promotions")
        .select("*")
        .ilike("code", promo_code)
        .eq("status", "active")
        .single();

      if (
        promo &&
        (!promo.usage_limit || promo.usage_count < promo.usage_limit)
      ) {
        if (promo.discount_type === "percentage") {
          marketingDiscount = baseTotalAmount * (promo.discount_value / 100);
        } else if (promo.discount_type === "fixed") {
          marketingDiscount = promo.discount_value;
        }
        appliedPromoId = promo.id;
      }
    }

    // "Best Price Wins" Rule (No Stacking)
    let finalDiscountAmount = 0;
    if (seniorPwdDiscount >= marketingDiscount) {
      finalDiscountAmount = seniorPwdDiscount;
      appliedPromoId = null; // We drop the promo because Senior is better
    } else {
      finalDiscountAmount = marketingDiscount;
    }

    const calculatedTotal = baseTotalAmount - finalDiscountAmount;

    // 4. Availability Check
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

    // 5. Create Booking
    const SECURITY_DEPOSIT = 1000.0;

    const { data: bookingData, error: insertError } = await adminDb
      .from("bookings")
      .insert({
        guest_id: user.id,
        room_type_id,
        check_in_date: check_in,
        check_out_date: check_out,
        guests_count: totalHeadcount,
        adults: numAdults,
        children: numChildren,
        infants: numInfants,
        total_amount: calculatedTotal,
        discount_amount: finalDiscountAmount, // <-- NEW
        promo_id: appliedPromoId, // <-- NEW
        security_deposit_amount: SECURITY_DEPOSIT,
        security_deposit_status: "pending",
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 💥 TRIGGER ATOMIC RPC IF PROMO WAS USED
    if (appliedPromoId) {
      await adminDb.rpc("increment_promo_usage", {
        promo_id_param: appliedPromoId,
      });
    }

    // 5.5 INSERT DISCOUNT VERIFICATIONS
    if (discounts && discounts.length > 0) {
      const discountPayload = discounts.map(
        (d: {
          guest_name: string;
          discount_type: string;
          id_number: string;
          id_image_url: string;
        }) => ({
          booking_id: bookingData.id,
          guest_name: d.guest_name,
          discount_type: d.discount_type,
          id_number: d.id_number,
          id_image_url: d.id_image_url,
          verification_status: "Pending",
        }),
      );

      const { error: discountError } = await adminDb
        .from("booking_discounts")
        .insert(discountPayload);

      if (discountError) {
        // Log but don't fail — booking and payment are already secured
        console.error("Failed to insert discount records:", discountError);
      }
    }

    // 6. Send confirmation email asynchronously
    const { data: userProfile } = await adminDb
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const { data: roomDetails } = await adminDb
      .from("room_types")
      .select("name")
      .eq("id", room_type_id)
      .single();

    sendBookingConfirmationEmailWithRetry({
      guestName: userProfile?.full_name || "Guest",
      guestEmail: userProfile?.email || user.email || "",
      roomName: roomDetails?.name || "Room",
      checkInDate: check_in,
      checkOutDate: check_out,
      adults: numAdults,
      children: numChildren,
      infants: numInfants,
      totalAmount: calculatedTotal,
      bookingId: bookingData.id,
      specialRequests: body.special_requests || "",
    }).catch((emailError) => {
      console.error("Failed to send booking confirmation email:", emailError);
    });

    return NextResponse.json({ success: true, booking: bookingData });
  } catch (error: unknown) {
    console.error("Booking Error:", error);
    const msg =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
