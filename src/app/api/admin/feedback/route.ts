import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ✅ Define the expected shape of the joined data
interface FeedbackReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users: {
    full_name: string | null;
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
      users ( full_name ),
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
    targetName: r.room_types?.name || r.Cottages?.name || "General Review",
    rating: r.rating,
    comment: r.comment,
    date: new Date(r.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: "Unread",
  }));

  return NextResponse.json(formattedReviews);
}
