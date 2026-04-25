import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { authorizeRole } from "@/lib/role-auth";
import { ROLES } from "@/lib/role_config";
import { logAdminAction } from "@/lib/admin-logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const { data: tasks, error } = await supabase
      .from("staff_tasks")
      .select(
        `
        *,
        staff ( id, first_name, last_name, position, avatar_url ),
        room_inventory ( room_number ) 
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(tasks);
  } catch (err: unknown) {
    console.error("Tasks API Error (GET):", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Just creates the task. Does NOT touch the room inventory yet!
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const body = await request.json();
    const { staff_id, title, description, priority, due_date, room_id } = body;

    const { data: task, error } = await supabase
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

    await logAdminAction(
      supabase,
      user!.id,
      "Created Task",
      `Task: ${title} assigned to Staff ID: ${staff_id}`,
    );

    return NextResponse.json({ success: true, data: task });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: The Operational Brain (Reacts to the Kanban Board)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const body = await request.json();
    const { task_id, status } = body;

    const { data: task, error } = await supabase
      .from("staff_tasks")
      .update({ status })
      .eq("id", task_id)
      .select()
      .single();

    if (error) throw error;

    // 🔒 THE TIMELINE AUTOMATION
    if (task.room_id) {
      // 1. Check the physical room's current state
      const { data: room } = await supabase
        .from("room_inventory")
        .select("status")
        .eq("id", task.room_id)
        .single();

      // 2. SAFEGUARD: Never overwrite an Occupied room
      if (room && room.status !== "occupied") {
        // CASE A: Task Started -> Change room to Cleaning/Maintenance
        if (status === "in_progress") {
          // Read the auto-generated title to know what kind of work it is
          const isMaintenance = task.title
            .toUpperCase()
            .includes("[MAINTENANCE]");
          const newStatus = isMaintenance ? "maintenance" : "cleaning";

          await supabase
            .from("room_inventory")
            .update({ status: newStatus })
            .eq("id", task.room_id);
        }

        // CASE B: Task Finished (or reverted to To-Do) -> Change room back to Available
        else if (status === "completed" || status === "pending") {
          // Only flip to available if it was physically blocked for work
          if (room.status === "cleaning" || room.status === "maintenance") {
            await supabase
              .from("room_inventory")
              .update({ status: "available" })
              .eq("id", task.room_id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: task });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
