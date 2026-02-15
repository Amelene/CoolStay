import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Helper to get date range configuration
function getDateConfig(range: string, targetDateStr?: string | null) {
  const now = new Date();
  // Default to "now", or parse the specific YYYY-MM provided by user
  let referenceDate = now;

  if (targetDateStr) {
    const [y, m] = targetDateStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      // Create date for 1st of selected month (Note: Month is 0-indexed in JS)
      referenceDate = new Date(y, m - 1, 1);
    }
  }

  let startDate = new Date();
  let labels: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mapIndexFn = (d: Date): number => 0;

  if (range === "month") {
    // Start of the SELECTED Month
    startDate = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1,
    );

    // Dynamic Labels based on actual weeks in that month
    labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

    mapIndexFn = (d) => {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const offset = firstDay.getDay();
      const currentDay = d.getDate();
      // Only map if it matches the selected month/year
      if (
        d.getMonth() !== startDate.getMonth() ||
        d.getFullYear() !== startDate.getFullYear()
      )
        return -1;
      return Math.floor((currentDay + offset - 1) / 7);
    };
  } else if (range === "week") {
    // Start of Current Week (Monday)
    // Note: Week filter usually implies "Current Week" for live monitoring
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startDate = new Date(now);
    startDate.setDate(now.getDate() + diff);
    startDate.setHours(0, 0, 0, 0);

    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    mapIndexFn = (d) => {
      // Simple filter: Just check if date >= startDate
      const diffTime = d.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7 ? diffDays : -1;
    };
  } else {
    // Default: Year (Current Year)
    startDate = new Date(now.getFullYear(), 0, 1);
    labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    mapIndexFn = (d) => {
      if (d.getFullYear() !== startDate.getFullYear()) return -1;
      return d.getMonth();
    };
  }

  return { startDate, labels, mapIndexFn };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await authorizeAdmin(supabase);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);

  // ✅ Get independent ranges AND specific dates
  const revenueRange = searchParams.get("revenue_range") || "year";
  const revenueDate = searchParams.get("revenue_date"); // e.g. "2025-10"

  const roomsRange = searchParams.get("rooms_range") || "year";
  const roomsDate = searchParams.get("rooms_date"); // e.g. "2025-10"

  const revenueConfig = getDateConfig(revenueRange, revenueDate);
  const roomsConfig = getDateConfig(roomsRange, roomsDate);

  // --- FETCH DATA ---
  // 1. Payments (Revenue) - Filter by startDate
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, created_at, status")
    .gte("created_at", revenueConfig.startDate.toISOString());

  // 2. Bookings (Rooms) - Filter by startDate
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, room_types(name)")
    .gte("created_at", roomsConfig.startDate.toISOString());

  // 3. Reports & Active Guests (Global)
  const { data: reports } = await supabase
    .from("analytics_reports")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(5);

  const { count: activeGuests } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "checked_in");

  // --- PROCESS REVENUE CHART ---
  const revenueData = new Array(revenueConfig.labels.length).fill(0);
  payments?.forEach((p) => {
    if (p.status === "paid" || p.status === "completed") {
      const idx = revenueConfig.mapIndexFn(new Date(p.created_at));
      if (idx >= 0 && idx < revenueData.length)
        revenueData[idx] += Number(p.amount);
    }
  });

  const revenueChart = revenueConfig.labels.map((name, i) => ({
    name,
    total: revenueData[i],
  }));

  // --- PROCESS ROOM POPULARITY ---
  // We need to filter bookings manually to ensure they are within the upper bound if looking at past months
  // (Since .gte() only handles start date)
  const roomCounts: Record<string, number> = {};
  bookings?.forEach((b) => {
    const bookingDate = new Date(b.created_at);
    // Use the map function to validate if it falls in the current view's bins
    const idx = roomsConfig.mapIndexFn(bookingDate);

    if (idx !== -1) {
      const roomName = b.room_types?.name || "Unknown";
      roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
    }
  });

  const roomPopularity = Object.keys(roomCounts)
    .map((name) => ({
      name,
      bookings: roomCounts[name],
      color: "#0077b6",
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  // --- KPI CALCULATION ---
  const totalRevenue = revenueData.reduce((a, b) => a + b, 0);
  const totalBookingsCount = Object.values(roomCounts).reduce(
    (a, b) => a + b,
    0,
  );

  return NextResponse.json({
    kpi: {
      totalRevenue,
      totalBookings: totalBookingsCount,
      activeGuests: activeGuests || 0,
      avgRating: 4.8,
    },
    revenueChart,
    roomPopularity,
    recentReports: reports || [],
  });
}
