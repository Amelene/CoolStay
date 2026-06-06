import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const userIds = [user.id, profile?.id].filter(Boolean) as string[];

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("booking_id")
    .in("user_id", userIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookingIds = (data || [])
    .map((review) => review.booking_id)
    .filter(Boolean);

  return NextResponse.json({ bookingIds });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId, roomId, rating, comment } = await request.json();
    const cleanComment = typeof comment === "string" ? comment.trim() : "";
    const numericRating = Number(rating);

    if (!bookingId || !roomId || !cleanComment) {
      return NextResponse.json(
        { error: "Missing required review details." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    const userIds = [user.id, profile?.id].filter(Boolean) as string[];

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, guest_id, room_type_id")
      .eq("id", bookingId)
      .in("guest_id", userIds)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found for this guest." },
        { status: 404 },
      );
    }

    if (booking.room_type_id !== roomId) {
      return NextResponse.json(
        { error: "Review room does not match the booking." },
        { status: 400 },
      );
    }

    const { data: existingReview, error: existingError } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 },
      );
    }

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this stay." },
        { status: 409 },
      );
    }

    const { error: insertError } = await supabaseAdmin.from("reviews").insert({
      user_id: booking.guest_id,
      room_id: roomId,
      booking_id: bookingId,
      rating: numericRating,
      comment: cleanComment,
    });

    if (insertError) {
      console.error("Review insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit review." },
      { status: 500 },
    );
  }
}
