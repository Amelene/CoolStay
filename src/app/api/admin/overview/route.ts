import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Use the standard client (respects RLS & Cookies)
    const supabase = await createClient();

    // 2. 🔒 SECURITY CHECK: Verify Admin Access
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Optional: Check specific admin role if you have it in metadata or table
    // const { data: isAdmin } = await supabase.rpc("is_admin");
    // if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const todayStr = new Date().toISOString().split("T")[0];

    const [
      paymentsRes,
      pendingBookingsRes,
      inquiriesRes,
      inventoryRes,
      arrivalsRes,
      departuresRes,
      activeGuestsRes,
      maintenanceRes,
    ] = await Promise.all([
      supabase
        .from("payments")
        .select("amount")
        .gte("created_at", `${todayStr}T00:00:00`)
        .neq("status", "pending")
        .neq("status", "failed"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("event_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("inventory_supplies")
        .select("id, current_stock, minimum_stock"),
      supabase
        .from("bookings")
        .select("id, guests_count, users (full_name), room_types (name)")
        .eq("check_in_date", todayStr)
        .eq("status", "confirmed"),
      supabase
        .from("bookings")
        .select("id, guests_count, users (full_name), room_types (name)")
        .eq("check_out_date", todayStr)
        .eq("status", "checked_in"),
      supabase
        .from("bookings")
        .select("guests_count")
        .eq("status", "checked_in"),
      supabase
        .from("room_inventory")
        .select("room_number, notes")
        .in("status", ["maintenance", "out_of_order"]),
    ]);

    // ... (Keep existing calculation logic) ...
    const revenue =
      paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const pendingBookings = pendingBookingsRes.count || 0;
    const newInquiries = inquiriesRes.count || 0;
    const lowStockCount = (inventoryRes.data || []).filter(
      (item) => item.current_stock <= item.minimum_stock,
    ).length;
    const activeGuests =
      activeGuestsRes.data?.reduce(
        (sum, b) => sum + (b.guests_count || 0),
        0,
      ) || 0;

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
      { status: 500 },
    );
  }
}
