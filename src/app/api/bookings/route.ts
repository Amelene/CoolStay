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
  const EXPIRATION_MINUTES = 30;
  const cutoffTime = new Date(
    Date.now() - EXPIRATION_MINUTES * 60 * 1000,
  ).toISOString();

  // 1. Fetch pending bookings older than 30 minutes, AND check if they have payments
  let fetchQuery = adminDb
    .from("bookings")
    .select("id, payments(id)")
    .eq("status", "pending")
    .lt("created_at", cutoffTime);

  if (userId) {
    fetchQuery = fetchQuery.eq("guest_id", userId);
  }

  const { data: expiredBookings, error: fetchError } = await fetchQuery;

  if (fetchError || !expiredBookings) {
    console.error("Auto-cleanup fetch error:", fetchError);
    return;
  }

  // 2. 🔒 THE FIX: Filter out bookings that have a receipt uploaded. Grant them immunity.
  const abandonedCartIds = expiredBookings
    .filter((b) => !b.payments || b.payments.length === 0)
    .map((b) => b.id);

  // 3. Only cancel the true, empty abandoned carts
  if (abandonedCartIds.length > 0) {
    const { error: updateError } = await adminDb
      .from("bookings")
      .update({
        status: "cancelled",
      })
      .in("id", abandonedCartIds);

    if (updateError) console.error("Auto-cleanup update error:", updateError);
  }
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
    const {
      room_type_id,
      check_in,
      check_out,
      adults,
      children,
      infants,
      seniors,
      pwds,
      booking_type,
    } = body;

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await cleanupExpiredBookings(adminDb);

    // 2. Check Room Details
    const { data: roomType, error: roomError } = await adminDb
      .from("room_types")
      // 🔒 FETCH NAME FOR CUTOFF VALIDATION
      .select(
        "total_rooms, base_price, price_day, price_night, price_overnight, capacity, name",
      )
      .eq("id", room_type_id)
      .single();

    if (roomError || !roomType) throw new Error("Room type not found.");

    const nowPHT = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    );
    const todayPHTStr = `${nowPHT.getFullYear()}-${String(nowPHT.getMonth() + 1).padStart(2, "0")}-${String(nowPHT.getDate()).padStart(2, "0")}`;

    if (check_in === todayPHTStr) {
      const currentHour = nowPHT.getHours();

      // Rule 1: Day Tours close at 2:00 PM (14:00)
      if (booking_type === "day" && currentHour >= 14) {
        return NextResponse.json(
          {
            error:
              "Same-day Day Tour bookings close at 2:00 PM. Please book for tomorrow.",
          },
          { status: 400 },
        );
      }
      // Rule 2: Night Tours close at 9:00 PM (21:00)
      else if (booking_type === "night" && currentHour >= 21) {
        return NextResponse.json(
          {
            error:
              "Same-day Night Tour bookings close at 9:00 PM. Please book for tomorrow.",
          },
          { status: 400 },
        );
      }
      // Rule 3: Overnight Rooms & Cottages close at 6:00 PM (18:00)
      else if (booking_type === "overnight" && currentHour >= 18) {
        return NextResponse.json(
          {
            error:
              "Same-day room reservations close at 6:00 PM. Please book for tomorrow.",
          },
          { status: 400 },
        );
      }
    }

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

    // 🔒 SERVER-SIDE DISCOUNT CALCULATION
    const { promo_code } = body;

    let seniorPwdDiscount = 0;
    if (totalHeadcount > 0 && (numSeniors > 0 || numPwds > 0)) {
      const perPaxRate = baseTotalAmount / totalHeadcount;
      const eligibleShare = perPaxRate * (numSeniors + numPwds);
      seniorPwdDiscount = eligibleShare * 0.2;
    }

    let marketingDiscount = 0;
    let appliedPromoId = null;

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

    let finalDiscountAmount = 0;
    if (seniorPwdDiscount >= marketingDiscount) {
      finalDiscountAmount = seniorPwdDiscount;
      appliedPromoId = null;
    } else {
      finalDiscountAmount = marketingDiscount;
    }

    const calculatedTotal = baseTotalAmount - finalDiscountAmount;

    // 4. Availability Check (Daily Concurrency Algorithm)
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
      .lt("check_in_date", searchEnd)
      .gte("check_out_date", searchStart); // .gte FIX APPLIED

    if (fetchError) throw fetchError;

    let maxConcurrency = 0;
    const dailyCounts: Record<string, number> = {};

    existingBookings?.forEach((b) => {
      const bStart = b.check_in_date;
      const bEnd =
        b.check_in_date === b.check_out_date
          ? new Date(new Date(b.check_in_date).getTime() + 86400000)
              .toISOString()
              .split("T")[0]
          : b.check_out_date;

      const overlapStart = new Date(
        Math.max(new Date(bStart).getTime(), new Date(searchStart).getTime()),
      );
      const overlapEnd = new Date(
        Math.min(new Date(bEnd).getTime(), new Date(searchEnd).getTime()),
      );

      const current = new Date(overlapStart);
      while (current < overlapEnd) {
        const dateStr = current.toISOString().split("T")[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;

        if (dailyCounts[dateStr] > maxConcurrency) {
          maxConcurrency = dailyCounts[dateStr];
        }

        current.setDate(current.getDate() + 1);
      }
    });

    if (maxConcurrency >= roomType.total_rooms) {
      return NextResponse.json(
        {
          error: `Fully booked! Maximum capacity reached on overlapping dates.`,
        },
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
        discount_amount: finalDiscountAmount,
        promo_id: appliedPromoId,
        security_deposit_amount: SECURITY_DEPOSIT,
        security_deposit_status: "pending",
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (appliedPromoId) {
      await adminDb.rpc("increment_promo_usage", {
        promo_id_param: appliedPromoId,
      });
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
