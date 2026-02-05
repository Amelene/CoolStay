import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function authorizeAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Check if logged in
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  // 2. Check if Admin (Using your RPC function or Metadata)
  // Ideally, use the RPC you had in staff/route.ts if it exists:
  // const { data: isAdmin } = await supabase.rpc("is_admin");

  // FALLBACK: If you don't have the RPC set up yet, check app_metadata
  // const isAdmin = user.app_metadata?.role === 'admin';

  // For now, let's stick to your pattern from staff/route.ts:
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Admins Only" },
        { status: 403 },
      ),
      user: null,
    };
  }

  return { error: null, user };
}
