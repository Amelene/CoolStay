// src/app/api/promotions/active/route.ts
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Prevent Next.js from caching the old banner

export async function GET() {
  try {
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch ALL promos that haven't been manually disabled
    const { data, error } = await adminDb
      .from("promotions")
      .select(
        "name, code, discount_value, discount_type, valid_from, valid_until, usage_count, usage_limit",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return NextResponse.json({ promo: null });
    }

    const now = new Date();

    // 🔒 THE RULES ENGINE: Find the first promo that is ACTUALLY valid right now
    const validPromo = data.find((promo) => {
      // 1. Depletion Check (Did it hit the limit?)
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit)
        return false;

      // 2. Future Check (Is it scheduled for tomorrow?)
      if (promo.valid_from && new Date(promo.valid_from) > now) return false;

      // 3. Expiration Check (Did it die yesterday?)
      if (promo.valid_until && new Date(promo.valid_until) < now) return false;

      return true; // It passed all checks!
    });

    return NextResponse.json({ promo: validPromo || null });
  } catch (error) {
    return NextResponse.json({ promo: null });
  }
}
