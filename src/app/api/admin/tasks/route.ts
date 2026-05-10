import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeRole, authorizeAdminOrFrontDesk } from "@/lib/role-auth";
import { ROLES, ALL_STAFF_ROLES } from "@/lib/role_config";
import { logAdminAction } from "@/lib/admin-logger";

/** Service-role client that bypasses RLS — used only for data lookups, not auth. */
const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// GET: All staff can read tasks, but `staff` role only sees their own.
export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError, user, role } = await authorizeRole(supabase, ALL_STAFF_ROLES);
    if (authError) return authError;

    const admin = getAdmin();

    // Build base query (using session client is fine for reading tasks)
    let query = admin
      .from("staff_tasks")
      .select(
        `*, staff ( id, first_name, last_name, position, avatar_url ), room_inventory ( room_number )`
      )
      .order("created_at", { ascending: false });

    // Operations staff only see tasks assigned to them.
    if (role === ROLES.STAFF) {
      // Step 1: resolve public.users.id from auth UID
      const { data: profile, error: profileErr } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();

      if (profileErr || !profile) {
        console.error("Tasks GET: profile lookup failed", profileErr?.message);
        return NextResponse.json([], { status: 200 }); // return empty rather than crashing
      }

      // Step 2: resolve staff.id from public.users.id
      const { data: staffRecord, error: staffErr } = await admin
        .from("staff")
        .select("id")
        .eq("user_id", profile.id)
        .single();

      if (staffErr || !staffRecord) {
        console.error("Tasks GET: staff record lookup failed", staffErr?.message);
        return NextResponse.json([], { status: 200 });
      }

      // Step 3: scope query to this staff member's tasks
      query = query.eq("staff_id", staffRecord.id) as typeof query;
    }

    const { data: tasks, error } = await query;
    if (error) throw error;
    return NextResponse.json(tasks);
  } catch (err: unknown) {
    console.error("Tasks API Error (GET):", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Only admin / manager / front_desk can create tasks.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeAdminOrFrontDesk(supabase);
    if (authError) return authError;

    const body = await request.json();
    const { staff_id, title, description, priority, due_date, room_id } = body;

    const admin = getAdmin();

    const { data: task, error } = await admin
      .from("staff_tasks")
      .insert({
        staff_id: Number(staff_id),
        title,
        description,
        priority: priority || "medium",
        due_date: due_date || null,
        room_id: room_id || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Notify the assigned staff member so it appears in their notification bell.
    // Chain: staff.id → staff.user_id (→ public.users.id) → public.users.auth_user_id
    const { data: staffRow } = await admin
      .from("staff")
      .select("user_id")
      .eq("id", Number(staff_id))
      .single();

    if (staffRow?.user_id) {
      const { data: profile } = await admin
        .from("users")
        .select("auth_user_id")
        .eq("id", staffRow.user_id)
        .single();

      if (profile?.auth_user_id) {
        await admin.from("notifications").insert({
          title: "New Task Assigned",
          message: title,
          type: "task",
          user_id: profile.auth_user_id,
          is_read: false,
        });
      }
    }

    await logAdminAction(
      supabase,
      user!.id,
      "Created Task",
      `Task: ${title} assigned to Staff ID: ${staff_id}`
    );

    return NextResponse.json({ success: true, data: task });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Staff can update status of their OWN tasks. Admins can update any.
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, role, user } = await authorizeRole(supabase, ALL_STAFF_ROLES);
    if (authError) return authError;

    const body = await request.json();
    const { task_id, status } = body;

    const admin = getAdmin();

    // Staff can only update status on their own tasks.
    if (role === ROLES.STAFF) {
      const { data: profile } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();

      const { data: staffRecord } = await admin
        .from("staff")
        .select("id")
        .eq("user_id", profile?.id)
        .single();

      const { data: taskCheck } = await admin
        .from("staff_tasks")
        .select("id")
        .eq("id", task_id)
        .eq("staff_id", staffRecord?.id)
        .single();

      if (!taskCheck) {
        return NextResponse.json(
          { error: "Forbidden: You can only update your own tasks" },
          { status: 403 }
        );
      }
    }

    const { data: task, error } = await admin
      .from("staff_tasks")
      .update({ status })
      .eq("id", task_id)
      .select()
      .single();

    if (error) throw error;

    // Room status automation
    if (task.room_id) {
      const { data: room } = await admin
        .from("room_inventory")
        .select("status")
        .eq("id", task.room_id)
        .single();

      if (room && room.status !== "occupied") {
        if (status === "in_progress") {
          const isMaintenance = task.title.toUpperCase().includes("[MAINTENANCE]");
          await admin
            .from("room_inventory")
            .update({ status: isMaintenance ? "maintenance" : "cleaning" })
            .eq("id", task.room_id);
        } else if (status === "completed" || status === "pending") {
          if (room.status === "cleaning" || room.status === "maintenance") {
            await admin
              .from("room_inventory")
              .update({ status: "available" })
              .eq("id", task.room_id);
          }
        }
      }
    }

    // ── Bidirectional kanban notifications ───────────────────────────────
    const statusLabels: Record<string, string> = {
      pending:     "To Do",
      in_progress: "In Progress",
      completed:   "Completed",
    };
    const statusLabel = statusLabels[status] ?? status;

    if (role === ROLES.STAFF) {
      // Staff moved a card → notify all admin/manager/front_desk
      // user_id = null means it lands in the admin-level notification bell
      await admin.from("notifications").insert({
        title:   "Task Progress Update",
        message: `"${task.title}" moved to ${statusLabel}`,
        type:    "task",
        user_id: null,
        is_read: false,
      });
    } else {
      // Admin/manager/front_desk moved a card → notify the assigned staff member
      const { data: staffRow } = await admin
        .from("staff")
        .select("user_id")
        .eq("id", task.staff_id)
        .single();

      if (staffRow?.user_id) {
        const { data: profile } = await admin
          .from("users")
          .select("auth_user_id")
          .eq("id", staffRow.user_id)
          .single();

        if (profile?.auth_user_id) {
          await admin.from("notifications").insert({
            title:   "Task Status Changed",
            message: `Your task "${task.title}" was updated to ${statusLabel}`,
            type:    "task",
            user_id: profile.auth_user_id,
            is_read: false,
          });
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, data: task });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
