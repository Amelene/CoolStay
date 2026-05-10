import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 🔐 RBAC Matrix — lists which roles can access each restricted path.
// Paths NOT listed here are accessible to ALL internal staff roles.
// Roles: admin > manager > front_desk > staff
const RESTRICTED_ADMIN_PATHS: Record<string, string[]> = {
  // 🔴 Admin only — HR, security, audit logs
  "/admin/staff": ["admin"],
  "/admin/security": ["admin"],
  "/admin/activity-logs": ["admin"],

  // 🟡 Admin + Manager — financials & analytics
  "/admin/inventory": ["admin", "manager"],
  "/admin/reports": ["admin", "manager"],
  "/admin/promotions": ["admin", "manager"],
  "/admin/expenses": ["admin", "manager"],

  // 🟢 Admin + Manager + Front Desk — guest-facing operations
  "/admin/bookings": ["admin", "manager", "front_desk"],
  "/admin/billing": ["admin", "manager", "front_desk"],
  "/admin/customers": ["admin", "manager", "front_desk"],
  "/admin/inquiries": ["admin", "manager", "front_desk"],
  "/admin/feedback": ["admin", "manager", "front_desk"],
  "/admin/rooms": ["admin", "manager", "front_desk"],

  // 🔵 All staff — /admin/dashboard, /admin/tasks,
  //    /admin/room-status, /admin/activities are NOT listed
  //    here, meaning all STAFF_ROLES can access them freely.
};

const PROTECTED_PATHS = [
  "/dashboard",
  "/profile",
  "/admin",
  "/api/bookings",
  "/api/admin",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const createRedirect = (path: string, searchParams?: URLSearchParams) => {
    const url = new URL(path, request.url);
    if (searchParams) {
      searchParams.forEach((val, key) => url.searchParams.set(key, val));
    }
    const redirectResponse = NextResponse.redirect(url);
    const cookiesToSet = response.cookies.getAll();
    cookiesToSet.forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));

  // --- 1. PROTECTED ROUTE CHECKS ---
  if (isProtected) {
    // A. Not Logged In
    if (!user) {
      if (path.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const params = new URLSearchParams();
      params.set("return_to", path);
      return createRedirect("/login", params);
    }

    // B. MFA CHECK
    const { data: mfaData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      mfaData &&
      mfaData.currentLevel === "aal1" &&
      mfaData.nextLevel === "aal2"
    ) {
      if (path.startsWith("/api")) {
        return NextResponse.json(
          { error: "2FA Verification Required" },
          { status: 403 },
        );
      }
      const params = new URLSearchParams();
      params.set("return_to", path);
      return createRedirect("/auth/verify-2fa", params);
    }

    // RLS SELECT policy on public.users is USING(true) — all rows readable.
    // Look up the role by auth_user_id (the FK to auth.users).
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    const userRole = dbUser?.role || "user";
    // All internal roles can access the admin area.
    // "user" is reserved for regular guests/customers.
    const STAFF_ROLES = ["admin", "manager", "front_desk", "staff"];
    const isAdmin = STAFF_ROLES.includes(userRole);

    // 1. INTERNAL STAFF TRYING TO ACCESS USER DASHBOARD -> SEND TO THEIR HOME
    if (path.startsWith("/dashboard") && isAdmin) {
      const staffHome = userRole === "staff" ? "/admin/tasks" : "/admin/dashboard";
      return createRedirect(staffHome);
    }

    // 2. STAFF ROLE TRYING TO ACCESS ADMIN DASHBOARD -> SEND TO TASKS
    if (path === "/admin/dashboard" && userRole === "staff") {
      return createRedirect("/admin/tasks");
    }

    // 2. USER TRYING TO ACCESS ADMIN AREA -> SEND TO USER DASHBOARD
    if (path.startsWith("/admin")) {
      if (!isAdmin) {
        return createRedirect("/dashboard");
      }

      // 3. ADMIN RBAC (Fine-grained permissions)
      for (const [route, allowedRoles] of Object.entries(
        RESTRICTED_ADMIN_PATHS,
      )) {
        if (path.startsWith(route)) {
          if (!allowedRoles.includes(userRole)) {
            return createRedirect("/admin/dashboard");
          }
        }
      }
    }
  }

  // --- 2. AUTH PAGE REDIRECTS ---
  if (["/login", "/register"].includes(path)) {
    if (user) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const target =
        dbUser?.role === "user" ? "/dashboard" : "/admin/dashboard";
      return createRedirect(target);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|coolstaylogo.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
