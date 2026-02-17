import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ✅ Define the expected shape of the joined data
interface FeedbackReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  status?: string;
  admin_reply?: string;
  replied_at?: string;
  user_id: string;
  users: {
    full_name: string | null;
    email: string | null;
  } | null;
  room_types: {
    name: string | null;
  } | null;
  Cottages: {
    name: string | null;
  } | null;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      created_at,
      status,
      admin_reply,
      replied_at,
      user_id,
      users ( full_name, email ),
      room_types ( name ),
      Cottages ( name )
    `,
    )
    .order("created_at", { ascending: false })
    .returns<FeedbackReview[]>(); // ✅ Strictly type the response

  if (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Helper to determine the target name (Room OR Cottage)
  const formattedReviews = (data || []).map((r) => ({
    id: r.id,
    guestName: r.users?.full_name || "Anonymous",
    guestEmail: r.users?.email || "",
    userId: r.user_id,
    targetName: r.room_types?.name || r.Cottages?.name || "General Review",
    rating: r.rating,
    comment: r.comment,
    date: new Date(r.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: r.status || "active",
    adminReply: r.admin_reply || null,
    repliedAt: r.replied_at || null,
  }));

  return NextResponse.json(formattedReviews);
}

// Archive/Unarchive feedback
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use Service Role to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from("reviews")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Archive feedback error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH feedback error:", error);
    return NextResponse.json(
      { error: "Failed to update feedback status" },
      { status: 500 }
    );
  }
}

// Send reply to guest
export async function POST(request: Request) {
  try {
    const { id, replyMessage, guestEmail, guestName, originalFeedback, rating, roomName } = await request.json();

    if (!id || !replyMessage || !guestEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use Service Role to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update the review with admin reply
    const { error: updateError } = await supabaseAdmin
      .from("reviews")
      .update({
        admin_reply: replyMessage,
        replied_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update reply error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    console.log("✅ Feedback reply saved successfully");

    // Note: Guest will see the reply in their feedback/reviews section
    // No email notification - reply is visible on user dashboard

    return NextResponse.json({
      success: true,
      message: "Reply saved successfully",
    });
  } catch (error) {
    console.error("POST feedback reply error:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
