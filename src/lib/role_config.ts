export const ROLES = {
  ADMIN: "admin",
  FRONT_DESK: "front_desk",
  USER: "user",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// ✅ FIXED: Explicitly typed as Record<string, UserRole[]> to allow .includes() check
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/admin/dashboard": [ROLES.ADMIN, ROLES.FRONT_DESK],
  "/admin/rooms": [ROLES.ADMIN, ROLES.FRONT_DESK],
  "/admin/customers": [ROLES.ADMIN, ROLES.FRONT_DESK],
  "/admin/billing": [ROLES.ADMIN, ROLES.FRONT_DESK],
  "/admin/inquiries": [ROLES.ADMIN, ROLES.FRONT_DESK],
  // Restricted Areas
  "/admin/inventory": [ROLES.ADMIN],
  "/admin/staff": [ROLES.ADMIN],
  "/admin/reports": [ROLES.ADMIN],
  "/admin/security": [ROLES.ADMIN],
  "/admin/promotions": [ROLES.ADMIN],
  "/admin/activity-logs": [ROLES.ADMIN],
};

export const hasAccess = (path: string, role: string) => {
  const key = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    path.startsWith(route)
  );

  if (!key) return true;

  const allowedRoles = ROUTE_PERMISSIONS[key];
  // Now safe because allowedRoles is known to be UserRole[]
  return allowedRoles.includes(role as UserRole);
};
