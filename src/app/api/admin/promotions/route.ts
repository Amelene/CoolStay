import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch all promos
export async function GET() {
  const supabase = await createClient();
  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  const { data: promos, error } = await supabase
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(promos);
}

// POST: Create a new promo
export async function POST(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();

    // 🔒 BACKEND GUARDRAIL: Prevent >100% discount
    if (
      body.discount_type === "percentage" &&
      Number(body.discount_value) > 100
    ) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("promotions")
      .insert([
        {
          code: body.code.toUpperCase(),
          name: body.name,
          discount_type: body.discount_type,
          discount_value: Number(body.discount_value),
          min_spend: body.min_spend ? Number(body.min_spend) : 0,
          usage_limit: body.usage_limit ? Number(body.usage_limit) : null,
          valid_from: body.valid_from || new Date().toISOString(),
          valid_until: body.valid_until || null,
          status: "active",
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error creating promo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: The "Kill Switch" (Toggle Status)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const { id, status } = await request.json();
    const { data, error } = await supabase
      .from("promotions")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error updating promo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Completely remove a promo
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "Promo ID required" }, { status: 400 });

    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error deleting promo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
