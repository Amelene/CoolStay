import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { booking_id, amount, method, proof_url } = await request.json();

    // 1. Check User Session
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Validate Ownership
    // Ensure the booking actually belongs to this user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("id", booking_id)
      .eq("guest_id", user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found or access denied" },
        { status: 403 }
      );
    }

    // 3. Determine Status (FIXED)
    // Matches your DB constraint: 'pending', 'completed', 'failed', 'refunded'
    // 'cash' would be instant (completed), but uploads (gcash) are pending.
    const status = method === "cash" ? "completed" : "pending";

    // 4. Create Payment Record
    const { data, error } = await supabase
      .from("payments")
      .insert({
        id: crypto.randomUUID(),
        booking_id,
        user_id: user.id,
        amount: amount,
        payment_method: method,
        status: status, // Now uses the variable
        proof_url: proof_url,
        description: "User uploaded proof of payment",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    let message = "Payment submission failed";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
