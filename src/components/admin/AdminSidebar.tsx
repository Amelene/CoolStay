"use client";

import { ROLES, hasAccess } from "@/lib/role_config"; // Added access check
import { createClient } from "@/lib/supabase/client"; // Added client
import {
  BarChart3,
  BedDouble,
  CalendarCheck,
  ClipboardList,
  FileText,
  History,
  IdCard,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShieldCheck,
  UserCog,
  Waves,
  Megaphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react"; // Added hooks

// Grouped Menu Structure
const menuGroups = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Manage Bookings",
        href: "/admin/bookings",
        icon: CalendarCheck,
      },
      { name: "Room Availability", href: "/admin/rooms", icon: BedDouble },
      { name: "Activity Management", href: "/admin/activities", icon: Waves },
      { name: "Inventory Management", href: "/admin/inventory", icon: Package },
      {
        name: "Event Inquiries",
        href: "/admin/inquiries",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "People & Engagement",
    items: [
      { name: "Customer Management", href: "/admin/customers", icon: UserCog },
      { name: "Staff Management", href: "/admin/staff", icon: IdCard },
      {
        name: "Guest Engagement",
        href: "/admin/feedback",
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Finance & Reports",
    items: [
      { name: "Billing & Invoices", href: "/admin/billing", icon: FileText },
      { name: "Reports & Analytics", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      {
        name: "Discounts & Promos",
        href: "/admin/promotions",
        icon: Megaphone,
      },
      { name: "Activity Logs", href: "/admin/activity-logs", icon: History },
      { name: "Security", href: "/admin/security", icon: ShieldCheck },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  // ✅ 1. Fetch User Role on Mount
  useEffect(() => {
    const fetchRole = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserRole(data?.role || ROLES.USER);
      }
    };
    fetchRole();
  }, []);

  // Optional: Show loading state or empty while fetching role to prevent flickering
  // if (!userRole) return null;

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-[#9ecbf7] z-40 hidden lg:flex flex-col font-sans">
      {/* Brand Header (Preserved Original Style) */}
      <div className="h-16 flex items-center justify-center gap-3 bg-[#0A1A44] shadow-md z-50 shrink-0">
        <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-white/20">
          <Image
            src="/images/logo/coolstaylogo.jpg"
            alt="CoolStay Logo"
            fill
            className="object-cover"
          />
        </div>
        <h1 className="text-xl font-serif font-bold text-white tracking-wide">
          CoolStay
        </h1>
      </div>

      {/* Navigation Menu (Updated with Groups) */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar border-r border-blue-300/50">
        {menuGroups.map((group, index) => {
          // ✅ 2. Filter Items based on Role
          // If userRole is not loaded yet, we hide everything to be safe (or show nothing)
          const visibleItems = userRole
            ? group.items.filter((item) => hasAccess(item.href, userRole))
            : [];

          // Hide empty groups
          if (visibleItems.length === 0) return null;

          return (
            <div key={index}>
              {/* Group Header */}
              <h3 className="px-2 text-[11px] font-extrabold text-[#0A1A44]/70 uppercase tracking-widest mb-2">
                {group.title}
              </h3>

              {/* Group Items */}
              <div className="space-y-1.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#3b82f6]/40 border-2 border-[#2563eb] text-black shadow-sm"
                          : "text-slate-900 hover:bg-blue-300/50 border-2 border-transparent"
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 ${
                          isActive ? "text-black" : "text-slate-800"
                        }`}
                      />
                      <span className="leading-none">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
