import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAction } from "@/lib/admin-logger";
import { authorizeAdmin } from "@/lib/admin-auth";

// --- TYPES for Manual Fetching ---
interface Payment {
  id: string;
  booking_id: string | null;
  user_id: string | null;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  description: string | null;
  proof_url: string | null;
}

interface Booking {
  id: string;
  guest_id: string | null;
  check_in_date: string;
  check_out_date: string;
  room_type_id: string | null;
  total_amount: number;
  status: string;
}

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface RoomType {
  id: string;
  name: string;
}

// --- HELPER: AUTO-BALANCE LOGIC ---
// Extracted so both POST and PATCH can use it
async function updateBookingStatus(
  supabase: SupabaseClient,
  bookingId: string,
) {
  try {
    // 1. Fetch Booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, total_amount, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) return;

    // 2. Fetch All Completed Payments
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from("payments")
      .select("amount")
      .eq("booking_id", bookingId)
      .eq("status", "completed");

    if (allPaymentsError) return;

    // 3. Calculate Math
    // Explicitly type 'p' to avoid 'any' error
    const totalPaid = (allPayments || []).reduce(
      (sum: number, p: { amount: number | string }) => {
        return sum + Number(p.amount);
      },
      0,
    );

    const totalDue = Number(booking.total_amount);

    // 4. Determine New Statuses
    let newPaymentStatus = "pending";
    let newBookingStatus = booking.status;

    if (totalPaid >= totalDue) {
      newPaymentStatus = "paid";
      if (newBookingStatus === "pending") {
        newBookingStatus = "confirmed";
      }
    } else if (totalPaid > 0) {
      newPaymentStatus = "partial";
      if (newBookingStatus === "pending") {
        newBookingStatus = "confirmed";
      }
    }

    // 5. Update the Booking
    await supabase
      .from("bookings")
      .update({
        payment_status: newPaymentStatus,
        status: newBookingStatus,
      })
      .eq("id", booking.id);
  } catch (error) {
    console.error("Auto-Balance Error:", error);
  }
}

// GET: Fetch all transactions
export async function GET() {
  try {
    const supabase = await createClient();

    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    // 2. Fetch All Payments (Raw)
    const { data: rawPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;
    const payments = rawPayments as Payment[];

    // 3. Extract Booking IDs
    // FIXED: Replaced .filter(Boolean) with explicit type guard to remove 'any' error
    const bookingIds = Array.from(
      new Set(
        payments.map((p) => p.booking_id).filter((id): id is string => !!id),
      ),
    );

    // 4. Fetch Related Bookings (Raw)
    const bookingsMap: Record<string, Booking> = {};
    const userIds = new Set<string>();
    const roomTypeIds = new Set<string>();

    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, guest_id, check_in_date, check_out_date, room_type_id, total_amount, status",
        )
        .in("id", bookingIds);

      (bookings as Booking[])?.forEach((b) => {
        bookingsMap[b.id] = b;
        if (b.guest_id) userIds.add(b.guest_id);
        if (b.room_type_id) roomTypeIds.add(b.room_type_id);
      });
    }

    // 5. Fetch Users (Raw)
    const usersMap: Record<string, User> = {};
    const userIdArray = Array.from(userIds);

    if (userIdArray.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email, phone")
        .in("id", userIdArray);

      (users as User[])?.forEach((u) => {
        usersMap[u.id] = u;
      });
    }

    // 6. Fetch Room Types (Raw - for Receipt Name)
    const roomsMap: Record<string, string> = {};
    const roomTypeIdArray = Array.from(roomTypeIds);

    if (roomTypeIdArray.length > 0) {
      const { data: rooms } = await supabase
        .from("room_types")
        .select("id, name")
        .in("id", roomTypeIdArray);

      (rooms as RoomType[])?.forEach((r) => {
        roomsMap[r.id] = r.name;
      });
    }

    // 7. Stitch it all together
    const formatted = payments.map((p) => {
      const booking = p.booking_id ? bookingsMap[p.booking_id] : null;
      const guestId = booking?.guest_id || p.user_id;
      const user = guestId ? usersMap[guestId] : null;
      const roomName = booking?.room_type_id
        ? roomsMap[booking.room_type_id]
        : "General";

      return {
        id: p.id,
        booking_id: p.booking_id,
        guest: user?.full_name || "Unknown Guest",
        email: user?.email || "N/A",
        phone: user?.phone || "N/A",
        amount: p.amount,
        method: p.payment_method,
        type: (p.amount || 0) < 0 ? "Refund" : "Payment",
        status: p.status,
        proof_url: p.proof_url,
        date: p.created_at
          ? new Date(p.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "N/A",
        room_name: roomName,
        check_in: booking?.check_in_date,
        check_out: booking?.check_out_date,
        total_booking_amount: booking?.total_amount || 0,
      };
    });

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    console.error("Billing API Error:", err);
    let message = "Internal Server Error";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Record a new Transaction (Payment or Refund)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { error: authError } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();
    const { booking_id, amount, method, type, notes } = body;

    const finalAmount =
      type === "refund" ? -Math.abs(amount) : Math.abs(amount);
    const status = method === "cash" ? "completed" : "pending";

    const { data, error } = await supabase
      .from("payments")
      .insert({
        id: crypto.randomUUID(),
        booking_id,
        amount: finalAmount,
        payment_method: method,
        status: status,
        description: notes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger auto-balance if payment is completed immediately (e.g. Cash)
    if (status === "completed" && booking_id) {
      await updateBookingStatus(supabase, booking_id);
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    let message = "Transaction Failed";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Verify Payment & Auto-Update Booking Balance
// PATCH: Verify Payment & Auto-Update Booking Balance
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // ✅ FIX 1: Extract 'user' here
    const { error: authError, user } = await authorizeAdmin(supabase);
    if (authError) return authError;

    const body = await request.json();
    const { payment_id, status, verified_amount } = body;

    // ... (Keep existing Logic for updateData) ...
    const updateData: { status: string; amount?: number } = { status };
    if (
      status === "completed" &&
      verified_amount !== undefined &&
      verified_amount !== null
    ) {
      const parsedAmount = Number(verified_amount);
      if (!isNaN(parsedAmount)) {
        updateData.amount = parsedAmount;
      }
    }

    // 2. Update the Payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", payment_id)
      .select("booking_id, amount")
      .maybeSingle();

    if (paymentError || !payment) {
      throw paymentError || new Error("Payment not found");
    }

    // ✅ LOG THE ACTION
    // Now 'user' is defined and safe to use because we checked authError above
    await logAdminAction(
      supabase,
      user!.id, // use ! because we know user exists if auth passed
      status === "completed" ? "Verified Payment" : "Rejected Payment",
      `Payment ID: ${payment_id.substring(0, 8)} | Amount: ${
        updateData.amount || payment.amount
      }`,
    );

    // IF REJECTED, stop here.
    if (status !== "completed") {
      return NextResponse.json({ success: true, payment });
    }

    // 3. Trigger Auto-Balance Helper
    if (payment.booking_id) {
      await updateBookingStatus(supabase, payment.booking_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("API Error:", err);
    let message = "Internal Server Error";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
