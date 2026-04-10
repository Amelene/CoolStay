import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code, cart_total } = await request.json();

    if (!code)
      return NextResponse.json(
        { error: "Promo code is required" },
        { status: 400 },
      );

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch the promo
    const { data: promo, error } = await adminDb
      .from("promotions")
      .select("*")
      .ilike("code", code.trim()) // case-insensitive match
      .single();

    if (error || !promo) {
      return NextResponse.json(
        { error: "Invalid promo code" },
        { status: 404 },
      );
    }

    // Rule 1: Kill Switch
    if (promo.status !== "active") {
      return NextResponse.json(
        { error: "This promo code is no longer active" },
        { status: 400 },
      );
    }

    // Rule 2: Time Gate
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return NextResponse.json(
        { error: "This promo code is not active yet" },
        { status: 400 },
      );
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return NextResponse.json(
        { error: "This promo code has expired" },
        { status: 400 },
      );
    }

    // Rule 3: Limit Gate
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return NextResponse.json(
        { error: "This promo code has reached its redemption limit" },
        { status: 400 },
      );
    }

    // Rule 4: Minimum Spend Gate
    if (promo.min_spend && cart_total < promo.min_spend) {
      return NextResponse.json(
        { error: `Minimum spend of ₱${promo.min_spend} required` },
        { status: 400 },
      );
    }

    // Success! Return the discount details
    return NextResponse.json({
      success: true,
      promo: {
        id: promo.id,
        code: promo.code,
        type: promo.discount_type,
        value: promo.discount_value,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
