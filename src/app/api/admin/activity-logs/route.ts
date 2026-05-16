import { authorizeAdminOnly } from "@/lib/role-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 1000;

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin only
    const { error: authError } = await authorizeAdminOnly(supabase);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      toPositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "";
    const action = searchParams.get("action")?.trim() || "";
    const startDate = searchParams.get("startDate")?.trim() || "";
    const endDate = searchParams.get("endDate")?.trim() || "";
    const shouldFilterUser = Boolean(role);
    const usersSelect = shouldFilterUser
      ? "users:users!inner ( full_name, email, role )"
      : "users ( full_name, email, role )";

    let query = supabase
      .from("admin_activity_logs")
      .select(
        `
        id,
        action,
        created_at,
        ip_address,
        device_info,
        ${usersSelect}
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[,%()]/g, " ").trim();
      const searchParts = [
        `action.ilike.%${safeSearch}%`,
        `device_info.ilike.%${safeSearch}%`,
        `ip_address.ilike.%${safeSearch}%`,
      ];

      const { data: matchingUsers, error: matchingUsersError } = await supabase
        .from("users")
        .select("id, auth_user_id")
        .or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);

      if (matchingUsersError) throw matchingUsersError;

      const matchingUserIds = Array.from(
        new Set(
          (matchingUsers || [])
            .flatMap((user) => [user.id, user.auth_user_id])
            .filter(Boolean),
        ),
      );

      if (matchingUserIds.length > 0) {
        searchParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
      }

      query = query.or(searchParts.join(","));
    }

    if (role) query = query.eq("users.role", role);
    if (action) query = query.ilike("action", `%${action}%`);
    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59.999`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Activity logs query error:", error);
      throw error;
    }

    return NextResponse.json({
      data: data || [],
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    });
  } catch (error: unknown) {
    let message = "Internal Server Error";
    if (error instanceof Error) {
      message = error.message;
      console.error("Activity logs API error:", error);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
