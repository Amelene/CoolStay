import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Reuse the logic from your main analytics route to ensure consistency
// Ideally, extract this logic into a helper file (lib/analytics.ts),
// but for now, we will fetch the live data endpoint logic here.

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { kpi, revenueChart, roomPopularity, rangeLabel } = body;

  const { error: authError, user } = await authorizeAdmin(supabase);
  if (authError) return authError;

  // 1. Prepare the Snapshot Data
  const reportSnapshot = {
    title: "Performance Report",
    generatedAt: new Date().toLocaleDateString(),
    range: rangeLabel,
    kpi: {
      revenue: kpi.totalRevenue,
      bookings: kpi.totalBookings,
      occupancy: kpi.activeGuests,
      rating: kpi.avgRating,
    },
    revenueData: revenueChart,
    roomData: roomPopularity,
  };

  // 2. Save Snapshot to DB
  const { error } = await supabase.from("analytics_reports").insert({
    report_type: "Performance Summary",
    time_range: rangeLabel,
    report_content: JSON.stringify(reportSnapshot), // ✅ SAVING THE SNAPSHOT
    success: true,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
