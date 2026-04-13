import { authorizeAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Helper to get date range configuration
function getDateConfig(range: string, targetDateStr?: string | null) {
  // ... (Keep your existing getDateConfig function exactly as it is) ...
  const now = new Date();
  let referenceDate = now;

  if (targetDateStr) {
    const [y, m] = targetDateStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      referenceDate = new Date(y, m - 1, 1);
    }
  }

  let startDate = new Date();
  let labels: string[] = [];
  let mapIndexFn: (d: Date) => number = () => 0;

  if (range === "month") {
    startDate = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1,
    );
    labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
    mapIndexFn = (d) => {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const offset = firstDay.getDay();
      const currentDay = d.getDate();
      if (
        d.getMonth() !== startDate.getMonth() ||
        d.getFullYear() !== startDate.getFullYear()
      )
        return -1;
      return Math.floor((currentDay + offset - 1) / 7);
    };
  } else if (range === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startDate = new Date(now);
    startDate.setDate(now.getDate() + diff);
    startDate.setHours(0, 0, 0, 0);
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    mapIndexFn = (d) => {
      const diffTime = d.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7 ? diffDays : -1;
    };
  } else {
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

  const revenueRange = searchParams.get("revenue_range") || "year";
  const revenueDate = searchParams.get("revenue_date");
  const roomsRange = searchParams.get("rooms_range") || "year";
  const roomsDate = searchParams.get("rooms_date");

  const revenueConfig = getDateConfig(revenueRange, revenueDate);
  const roomsConfig = getDateConfig(roomsRange, roomsDate);

  // --- FETCH DATA ---
  // 1. Payments (Gross Revenue)
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, created_at, status")
    .gte("created_at", revenueConfig.startDate.toISOString());

  // 2. Expenses (Outflow) - 🔒 NEW: Fetch expenses for the same period
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, expense_date")
    .gte("expense_date", revenueConfig.startDate.toISOString());

  // 3. Bookings (Rooms)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, room_types(name)")
    .gte("created_at", roomsConfig.startDate.toISOString());

  // 4. Reports & Active Guests
  const { data: reports } = await supabase
    .from("analytics_reports")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(5);

  const { count: activeGuests } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "checked_in");

  // --- PROCESS REVENUE CHART & TOTALS ---
  const revenueData = new Array(revenueConfig.labels.length).fill(0);
  let totalRevenue = 0;

  payments?.forEach((p) => {
    // Only count completed/paid money
    if (p.status === "paid" || p.status === "completed") {
      const amt = Number(p.amount);
      totalRevenue += amt; // Add to global total

      const idx = revenueConfig.mapIndexFn(new Date(p.created_at));
      if (idx >= 0 && idx < revenueData.length) {
        revenueData[idx] += amt; // Add to chart bin
      }
    }
  });

  const revenueChart = revenueConfig.labels.map((name, i) => ({
    name,
    total: revenueData[i],
  }));

  // --- PROCESS EXPENSES & NET PROFIT --- 🔒 NEW
  let totalExpenses = 0;
  expenses?.forEach((e) => {
    totalExpenses += Number(e.amount);
  });

  const netProfit = totalRevenue - totalExpenses;

  // --- PROCESS ROOM POPULARITY ---
  const roomCounts: Record<string, number> = {};
  bookings?.forEach((b) => {
    const bookingDate = new Date(b.created_at);
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

  const totalBookingsCount = Object.values(roomCounts).reduce(
    (a, b) => a + b,
    0,
  );

  // --- RETURN UPDATED KPI ---
  return NextResponse.json({
    kpi: {
      totalRevenue, // Gross Cash-in
      totalExpenses, // 🔒 NEW: Operational costs
      netProfit, // 🔒 NEW: True bottom line
      totalBookings: totalBookingsCount,
      activeGuests: activeGuests || 0,
      avgRating: 4.8,
    },
    revenueChart,
    roomPopularity,
    recentReports: reports || [],
  });
}
