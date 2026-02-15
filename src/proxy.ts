import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RESTRICTED_ADMIN_PATHS = {
  "/admin/inventory": ["admin"],
  "/admin/staff": ["admin"],
  "/admin/reports": ["admin"],
  "/admin/security": ["admin"],
  "/admin/promotions": ["admin"],
  "/admin/activity-logs": ["admin"],
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

    // --- C. ROLE ENFORCEMENT (New Logic) ---
    // Fetch role once for all checks
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = dbUser?.role || "user";
    const isAdmin = userRole === "admin" || userRole === "front_desk";

    // 1. ADMIN TRYING TO ACCESS USER DASHBOARD -> SEND TO ADMIN DASHBOARD
    if (path.startsWith("/dashboard") && isAdmin) {
      return createRedirect("/admin/dashboard");
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
