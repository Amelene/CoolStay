import { logAdminAction } from "@/lib/admin-logger";
import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { error: authError, user } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const { id } = await context.params;

    const { data: item, error: itemError } = await supabase
      .from("inventory_supplies")
      .select("item_name")
      .eq("id", id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { count, error: countError } = await supabase
      .from("supply_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("supply_id", id);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      const { error: archiveError } = await supabase
        .from("inventory_supplies")
        .update({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (archiveError) throw archiveError;

      await logAdminAction(
        supabase,
        user!.id,
        "Archived Inventory Item",
        `Item: ${item.item_name} | Existing transactions: ${count}`,
      );

      return NextResponse.json({ success: true, action: "archived" });
    }

    const { error: deleteError } = await supabase
      .from("inventory_supplies")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    await logAdminAction(
      supabase,
      user!.id,
      "Deleted Inventory Item",
      `Item: ${item.item_name}`,
    );

    return NextResponse.json({ success: true, action: "deleted" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
