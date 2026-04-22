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
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();

    // 🔒 NEW: We now extract assigned_room_id
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

    // --- 🔒 NEW: THE MOVIE SEAT LOGIC (Physical Room Lifecycle) ---
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

      // Must have a physical room assigned to check in
      if (!assigned_room_id && !booking.assigned_room_id) {
        return NextResponse.json(
          { error: "You must select a specific room to check this guest in." },
          { status: 400 },
        );
      }

      // Mark the physical "Movie Seat" as occupied
      const targetRoom = assigned_room_id || booking.assigned_room_id;
      await supabase
        .from("room_inventory")
        .update({ status: "occupied" })
        .eq("id", targetRoom);
    }

    if (status === "checked_out") {
      // Free up the "Movie Seat" for Housekeeping
      if (booking.assigned_room_id) {
        await supabase
          .from("room_inventory")
          .update({ status: "cleaning" })
          .eq("id", booking.assigned_room_id);
      }
    }
    // --------------------------------------------------------------

    interface UpdatePayload {
      status?: string;
      security_deposit_status?: string;
      security_deposit_notes?: string | null;
      assigned_room_id?: string;
    }

    const updatePayload: UpdatePayload = {};
    if (status) updatePayload.status = status;
    if (security_deposit_status)
      updatePayload.security_deposit_status = security_deposit_status;
    if (security_deposit_notes !== undefined)
      updatePayload.security_deposit_notes = security_deposit_notes;
    if (assigned_room_id) updatePayload.assigned_room_id = assigned_room_id;

    const { data, error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 🔒 NEW: Trigger User Notifications on Status Change
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

    // ... (Keep your existing email notification logic here exactly as it is) ...

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
    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

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
      .select("total_rooms, name")
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

    // 🔔 Send email notification for new confirmed booking
    console.log(
      "New booking created with confirmed status, sending email notification...",
    );

    // Fetch user details for email
    const { data: userProfile } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Send email asynchronously (don't block the response)
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
