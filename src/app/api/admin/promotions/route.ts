import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch all promos
export async function GET() {
  const supabase = await createClient();

  // 🔒 SECURITY CHECK
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

  // 🔒 SECURITY CHECK (CRITICAL: Was missing!)
  const { error: authError } = await authorizeAdminOnly(supabase);
  if (authError) return authError;

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("promotions")
      .insert([
        {
          code: body.code,
          name: body.name,
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          valid_until: body.valid_until,
          status: "active",
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error creating promo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
