import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { authorizeRole } from "@/lib/role-auth";
import { ROLES } from "@/lib/role_config";
import { logAdminAction } from "@/lib/admin-logger";

// GET: Fetch all tasks and join with the staff table
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
        staff ( id, first_name, last_name, position, avatar_url )
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

// POST: Create a new task
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeRole(supabase, [
      ROLES.ADMIN,
      ROLES.FRONT_DESK,
    ]);
    if (authError) return authError;

    const body = await request.json();
    const { staff_id, title, description, priority, due_date } = body;

    const { data, error } = await supabase
      .from("staff_tasks")
      .insert({
        staff_id: Number(staff_id),
        title,
        description,
        priority: priority || "medium",
        due_date: due_date || null,
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

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update task status (Move across Kanban board)
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

    const { data, error } = await supabase
      .from("staff_tasks")
      .update({ status })
      .eq("id", task_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
