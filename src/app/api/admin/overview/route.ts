import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const todayStr = new Date().toISOString().split("T")[0];

    const [
      paymentsRes,
      pendingBookingsRes,
      inquiriesRes,
      inventoryRes,
      arrivalsRes,
      departuresRes,
      activeGuestsRes, // 1. Fetching guests instead of room counts
      maintenanceRes,
    ] = await Promise.all([
      // Revenue
      supabase
        .from("payments")
        .select("amount")
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`)
        .neq("status", "pending")
        .neq("status", "failed"),

      // Pending
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      // Inquiries
      supabase
        .from("event_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),

      // Low Stock
      supabase
        .from("inventory_supplies")
        .select("id, current_stock, minimum_stock"),

      // Arrivals
      supabase
        .from("bookings")
        .select("id, guests_count, users (full_name), room_types (name)")
        .eq("check_in_date", todayStr)
        .eq("status", "confirmed"),

      // Departures
      supabase
        .from("bookings")
        .select("id, guests_count, users (full_name), room_types (name)")
        .eq("check_out_date", todayStr)
        .eq("status", "checked_in"),

      // Active Guests (The Fix)
      supabase
        .from("bookings")
        .select("guests_count")
        .eq("status", "checked_in"),

      // Maintenance
      supabase
        .from("room_inventory")
        .select("room_number, notes")
        .in("status", ["maintenance", "out_of_order"]),
    ]);

    // Calculations
    const revenue =
      paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const pendingBookings = pendingBookingsRes.count || 0;
    const newInquiries = inquiriesRes.count || 0;

    const lowStockCount = (inventoryRes.data || []).filter(
      (item) => item.current_stock <= item.minimum_stock
    ).length;

    // 2. Sum up the guests
    const activeGuests =
      activeGuestsRes.data?.reduce(
        (sum, b) => sum + (b.guests_count || 0),
        0
      ) || 0;

    // 3. Return 'activeGuests' key
    return NextResponse.json({
      revenue,
      activeGuests,
      actionItems: pendingBookings + newInquiries,
      pendingBookings,
      newInquiries,
      lowStockCount,
      arrivals: arrivalsRes.data || [],
      departures: departuresRes.data || [],
      maintenance: maintenanceRes.data || [],
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
