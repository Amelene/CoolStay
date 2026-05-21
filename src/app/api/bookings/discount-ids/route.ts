import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { booking_id, discount_type, id_number, id_image_url } =
      await request.json();

    if (
      !booking_id ||
      !["Senior", "PWD"].includes(discount_type) ||
      !id_image_url
    ) {
      return NextResponse.json(
        { error: "Missing discount ID details" },
        { status: 400 },
      );
    }

    const admin = getAdmin();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, guest_id, users(full_name)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.guest_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const guestName =
      (booking.users as { full_name?: string } | null)?.full_name || "Guest";

    const { error } = await admin.from("booking_discounts").insert({
      booking_id,
      guest_name: guestName,
      discount_type,
      id_number: typeof id_number === "string" ? id_number.trim() : "",
      id_image_url,
      verification_status: "Pending",
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save discount ID";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
