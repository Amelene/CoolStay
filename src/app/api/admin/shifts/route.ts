import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeRole } from "@/lib/role-auth";
import { ROLES, ALL_STAFF_ROLES } from "@/lib/role_config";

/** Service-role client — bypasses RLS for staff lookups and notification inserts. */
const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  morning: { start: "06:00:00", end: "14:00:00" },
  mid: { start: "14:00:00", end: "22:00:00" },
  night: { start: "22:00:00", end: "06:00:00" },
};

const getDateRange = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: string[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }

  return dates;
};

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning (6AM–2PM)",
  mid:     "Mid (2PM–10PM)",
  night:   "Night (10PM–6AM)",
};

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeRole(supabase, ALL_STAFF_ROLES);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end   = searchParams.get("end");

    const admin = getAdmin();
    let query = admin.from("shifts").select("*");
    if (start && end) {
      query = query.gte("shift_date", start).lte("shift_date", end) as typeof query;
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Shifts GET Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    // Only admin / manager / front_desk can assign shifts
    const { error: authError } = await authorizeRole(supabase, [
      ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const body = await req.json();
    const { staff_id, staff_ids, shift_date, start_date, end_date, shift_type } =
      body;

    if (Array.isArray(staff_ids)) {
      const dates = getDateRange(start_date, end_date);
      const staffIds = staff_ids.map(Number).filter(Boolean);

      if (staffIds.length === 0 || dates.length === 0) {
        return NextResponse.json(
          { error: "Select staff and a valid date range" },
          { status: 400 },
        );
      }

      if (shift_type !== "off" && !SHIFT_TIMES[shift_type]) {
        return NextResponse.json({ error: "Invalid shift type" }, { status: 400 });
      }

      const admin = getAdmin();

      for (const staffId of staffIds) {
        for (const date of dates) {
          await admin.from("shifts").delete().match({
            staff_id: staffId,
            shift_date: date,
          });
        }
      }

      if (shift_type !== "off") {
        const { start: start_time, end: end_time } = SHIFT_TIMES[shift_type];
        const rows = staffIds.flatMap((staffId) =>
          dates.map((date) => ({
            staff_id: staffId,
            shift_date: date,
            shift_type,
            start_time,
            end_time,
            status: "scheduled",
          })),
        );

        const { error } = await admin.from("shifts").insert(rows);
        if (error) throw error;
      }

      await Promise.all(
        staffIds.map((staffId) =>
          notifyStaffRange(
            admin,
            staffId,
            dates[0],
            dates[dates.length - 1],
            shift_type,
          ),
        ),
      );

      return NextResponse.json({
        success: true,
        updated: staffIds.length * dates.length,
      });
    }

    if (!staff_id || !shift_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdmin();

    // Clear any existing shift for this staff on this date
    await admin.from("shifts").delete().match({ staff_id, shift_date });

    if (shift_type === "off" || !shift_type) {
      // Notify staff that their shift was removed
      await notifyStaff(admin, staff_id, shift_date, null);
      return NextResponse.json({ success: true, message: "Shift cleared" });
    }

    // Standard shift times
    const { start: start_time, end: end_time } = SHIFT_TIMES[shift_type] ?? { start: "09:00:00", end: "17:00:00" };

    const { data, error } = await admin
      .from("shifts")
      .insert({ staff_id, shift_date, shift_type, start_time, end_time, status: "scheduled" })
      .select()
      .single();

    if (error) throw error;

    // Notify the staff member about their new/updated shift
    await notifyStaff(admin, staff_id, shift_date, shift_type);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Shifts POST Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}

/** Resolves staff_id → auth_user_id and inserts a shift notification. */
async function notifyStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  staff_id: number,
  shift_date: string,
  shift_type: string | null
) {
  try {
    const { data: staffRow } = await admin
      .from("staff")
      .select("user_id, first_name")
      .eq("id", Number(staff_id))
      .single();

    if (!staffRow?.user_id) return;

    const { data: profile } = await admin
      .from("users")
      .select("auth_user_id")
      .eq("id", staffRow.user_id)
      .single();

    if (!profile?.auth_user_id) return;

    const dateLabel = new Date(shift_date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });

    const title   = shift_type ? "Shift Scheduled" : "Shift Removed";
    const message = shift_type
      ? `${SHIFT_LABELS[shift_type] ?? shift_type} on ${dateLabel}`
      : `Your shift on ${dateLabel} has been removed`;

    await admin.from("notifications").insert({
      title,
      message,
      type: "shift",
      user_id: profile.auth_user_id,
      is_read: false,
    });
  } catch (err) {
    // Non-critical — don't fail the whole request if notification fails
    console.warn("Shift notification failed:", err);
  }
}

async function notifyStaffRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  staff_id: number,
  start_date: string,
  end_date: string,
  shift_type: string
) {
  try {
    const { data: staffRow } = await admin
      .from("staff")
      .select("user_id")
      .eq("id", Number(staff_id))
      .single();

    if (!staffRow?.user_id) return;

    const { data: profile } = await admin
      .from("users")
      .select("auth_user_id")
      .eq("id", staffRow.user_id)
      .single();

    if (!profile?.auth_user_id) return;

    const startLabel = new Date(`${start_date}T00:00:00`).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    );
    const endLabel = new Date(`${end_date}T00:00:00`).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    );

    await admin.from("notifications").insert({
      title: shift_type === "off" ? "Shifts Removed" : "Shifts Scheduled",
      message:
        shift_type === "off"
          ? `Your shifts from ${startLabel} to ${endLabel} have been removed`
          : `${SHIFT_LABELS[shift_type] ?? shift_type} from ${startLabel} to ${endLabel}`,
      type: "shift",
      user_id: profile.auth_user_id,
      is_read: false,
    });
  } catch (err) {
    console.warn("Bulk shift notification failed:", err);
  }
}
