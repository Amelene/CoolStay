export const ROLES = {
  ADMIN:      "admin",
  MANAGER:    "manager",
  FRONT_DESK: "front_desk",
  STAFF:      "staff",
  USER:       "user",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// All roles that can enter the /admin area
export const ALL_STAFF_ROLES: UserRole[] = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.FRONT_DESK,
  ROLES.STAFF,
];

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // 🔴 Admin only
  "/admin/staff":         [ROLES.ADMIN],
  "/admin/security":      [ROLES.ADMIN],
  "/admin/activity-logs": [ROLES.ADMIN],

  // 🟡 Admin + Manager
  "/admin/inventory":  [ROLES.ADMIN, ROLES.MANAGER],
  "/admin/reports":    [ROLES.ADMIN, ROLES.MANAGER],
  "/admin/promotions": [ROLES.ADMIN, ROLES.MANAGER],
  "/admin/expenses":   [ROLES.ADMIN, ROLES.MANAGER],

  // 🟢 Admin + Manager + Front Desk
  "/admin/bookings":   [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],
  "/admin/billing":    [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],
  "/admin/customers":  [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],
  "/admin/inquiries":  [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],
  "/admin/feedback":   [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],
  "/admin/rooms":      [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],
  "/admin/dashboard":  [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],

  // 🟢 (continued) Activities management — front_desk+ only, NOT operations staff
  "/admin/activities":  [ROLES.ADMIN, ROLES.MANAGER, ROLES.FRONT_DESK],

  // 🔵 All internal staff — operational pages
  "/admin/tasks":       [...ALL_STAFF_ROLES],
  "/admin/room-status": [...ALL_STAFF_ROLES],
  "/admin/schedule":    [...ALL_STAFF_ROLES], // personal schedule view
};

export const hasAccess = (path: string, role: string): boolean => {
  const key = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    path.startsWith(route)
  );
  if (!key) return true; // unlisted paths are open to all staff
  return ROUTE_PERMISSIONS[key].includes(role as UserRole);
};

/** The landing page for each role after login */
export const ROLE_HOME: Record<UserRole, string> = {
  admin:      "/admin/dashboard",
  manager:    "/admin/dashboard",
  front_desk: "/admin/dashboard",
  staff:      "/admin/tasks",
  user:       "/dashboard",
};
