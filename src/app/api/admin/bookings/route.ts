import { authorizeAdmin } from "@/lib/admin-auth";
import { sendBookingConfirmationEmailWithRetry } from "@/lib/email-service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch all bookings
export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

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

    // 🔒 THE BULLETPROOF FIX: JavaScript Memory Filter
    const validBookings = data?.filter((b) => {
      const hasPaymentAttempt = b.payments && b.payments.length > 0;

      // 1. Hide active Phase 1 abandoned carts (Pending, no receipt uploaded)
      if (
        b.status === "pending" &&
        b.payment_status === "pending" &&
        !hasPaymentAttempt
      ) {
        return false;
      }

      // 2. Hide Auto-cancelled abandoned carts (Timeout, no receipt uploaded)
      if (
        b.status === "cancelled" &&
        !hasPaymentAttempt &&
        b.special_requests?.includes("Auto-cancelled")
      ) {
        return false;
      }

      // Show everything else (Phase 2 uploads, Walk-ins, Legitimate cancellations)
      return true;
    });

    return NextResponse.json(validBookings);
  } catch (error: unknown) {
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
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();

    const {
      id,
      status,
      security_deposit_status,
      security_deposit_notes,
      assigned_room_id,
    } = body;

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*, users(full_name, email, phone), room_types(name)")
      .eq("id", id)
      .single();

    if (fetchError || !booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (status === "checked_in") {
      // ✅ Use PHT timezone to avoid false "Cannot check in yet" errors when
      // the server's UTC clock is still on the previous calendar day.
      const nowPHT = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      );
      const todayPHTStr = `${nowPHT.getFullYear()}-${String(nowPHT.getMonth() + 1).padStart(2, "0")}-${String(nowPHT.getDate()).padStart(2, "0")}`;

      if (todayPHTStr < booking.check_in_date) {
        return NextResponse.json(
          {
            error: `Cannot check in yet. Scheduled for ${booking.check_in_date}`,
          },
          { status: 400 },
        );
      }

      // ✅ Tour check-in time-window guard (PHT)
      // Day Tours don't happen at 1 AM — enforce a sensible window.
      const roomNameLower = (booking.room_types?.name || "").toLowerCase();
      const currentHour = nowPHT.getHours();

      if (roomNameLower.includes("day tour")) {
        // Day Tour: 6:00 AM – 8:00 PM
        if (currentHour < 6 || currentHour >= 20) {
          return NextResponse.json(
            {
              error:
                "Day Tour check-in is only available between 6:00 AM and 8:00 PM. Please verify the booking date.",
            },
            { status: 400 },
          );
        }
      } else if (roomNameLower.includes("night tour")) {
        // Night Tour: 4:00 PM – 11:59 PM
        if (currentHour < 16) {
          return NextResponse.json(
            {
              error:
                "Night Tour check-in is only available from 4:00 PM onwards.",
            },
            { status: 400 },
          );
        }
      }

      if (!assigned_room_id && !booking.assigned_room_id) {
        return NextResponse.json(
          { error: "You must select a specific room to check this guest in." },
          { status: 400 },
        );
      }

      const targetRoom = assigned_room_id || booking.assigned_room_id;
      await supabase
        .from("room_inventory")
        .update({ status: "occupied" })
        .eq("id", targetRoom);
    }

    interface UpdatePayload {
      status?: string;
      security_deposit_status?: string;
      security_deposit_notes?: string | null;
      assigned_room_id?: string;
      check_out_date?: string; // 🔒 NEW: Added to allow early checkout overrides
    }

    const updatePayload: UpdatePayload = {};
    if (status) updatePayload.status = status;
    if (security_deposit_status)
      updatePayload.security_deposit_status = security_deposit_status;
    if (security_deposit_notes !== undefined)
      updatePayload.security_deposit_notes = security_deposit_notes;
    if (assigned_room_id) updatePayload.assigned_room_id = assigned_room_id;

    // 🔒 NEW: Early Checkout & Auto-Cleaning Logic
    if (status === "checked_out") {
      if (booking.assigned_room_id) {
        // Automatically lock the room so staff know it needs cleaning
        await supabase
          .from("room_inventory")
          .update({ status: "cleaning" })
          .eq("id", booking.assigned_room_id);
      }

      // Force the server to calculate exact PHT time
      const nowPHT = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
      );
      const todayPHTStr = `${nowPHT.getFullYear()}-${String(nowPHT.getMonth() + 1).padStart(2, "0")}-${String(nowPHT.getDate()).padStart(2, "0")}`;

      // If they checkout before their scheduled checkout date, shrink the booking window!
      if (todayPHTStr < booking.check_out_date) {
        updatePayload.check_out_date = todayPHTStr;
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (status === "checked_in" && booking.guest_id) {
      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: booking.guest_id,
        title: "Checked In! 🏖️",
        message: `Welcome to CoolStay! You have been successfully checked into your room.`,
        type: "booking_update",
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } else if (status === "confirmed" && booking.guest_id) {
      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: booking.guest_id,
        title: "Booking Confirmed",
        message: `Your booking for ${booking.check_in_date} is fully confirmed. See you soon!`,
        type: "booking_update",
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Update Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}

// POST: Create Booking (Walk-Ins)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();

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

    const guests_count = (Number(adults) || 1) + (Number(children) || 0);

    const { data: roomType } = await supabase
      .from("room_types")
      .select("total_rooms, name")
      .eq("id", room_type_id)
      .single();

    if (!roomType) throw new Error("Room type not found.");

    const nowPHT = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    );
    const todayPHTStr = `${nowPHT.getFullYear()}-${String(nowPHT.getMonth() + 1).padStart(2, "0")}-${String(nowPHT.getDate()).padStart(2, "0")}`;

    if (check_in_date === todayPHTStr) {
      const currentHour = nowPHT.getHours();
      const roomNameLower = roomType.name.toLowerCase();

      if (roomNameLower.includes("day tour") && currentHour >= 14) {
        return NextResponse.json(
          {
            error:
              "Same-day Day Tour bookings close at 2:00 PM. Please book for tomorrow.",
          },
          { status: 400 },
        );
      } else if (roomNameLower.includes("night tour") && currentHour >= 21) {
        return NextResponse.json(
          {
            error:
              "Same-day Night Tour bookings close at 9:00 PM. Please book for tomorrow.",
          },
          { status: 400 },
        );
      } else if (!roomNameLower.includes("tour") && currentHour >= 18) {
        return NextResponse.json(
          {
            error:
              "Same-day room reservations close at 6:00 PM. Please book for tomorrow.",
          },
          { status: 400 },
        );
      }
    }

    const searchStart = check_in_date;
    const searchEnd =
      check_out_date === check_in_date
        ? new Date(new Date(check_out_date).getTime() + 86400000)
            .toISOString()
            .split("T")[0]
        : check_out_date;

    const { data: existingBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("check_in_date, check_out_date")
      .eq("room_type_id", room_type_id)
      .in("status", ["confirmed", "pending", "checked_in"])
      .lt("check_in_date", searchEnd)
      .gte("check_out_date", searchStart);

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
        { error: "Room is fully booked" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        guest_id: user.id,
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

    const { data: userProfile } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    sendBookingConfirmationEmailWithRetry({
      guestName: userProfile?.full_name || "Guest",
      guestEmail: userProfile?.email || user.email || "",
      roomName: roomType?.name || "Room",
      checkInDate: check_in_date,
      checkOutDate: check_out_date,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      infants: Number(infants) || 0,
      totalAmount: total_amount,
      bookingId: data.id,
      specialRequests: special_requests,
    })
      .then((result: { success: boolean; error?: string }) => {
        if (result.success) {
          console.log("✅ Confirmation email sent successfully");
        } else {
          console.error("❌ Failed to send confirmation email:", result.error);
        }
      })
      .catch((err: unknown) => {
        console.error("❌ Email sending error:", err);
      });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Booking Creation Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}
