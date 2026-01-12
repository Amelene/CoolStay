"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Users,
  Bell,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Wrench,
  LogIn,
  LogOut,
  PlusCircle,
  FilePlus,
  Loader2,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- DATA TYPES ---
interface DashboardData {
  revenue: number;
  activeGuests: number;
  actionItems: number;
  pendingBookings: number;
  newInquiries: number;
  lowStockCount: number;
  arrivals: Array<{
    id: string;
    guests_count: number;
    users: { full_name: string } | null;
    room_types: { name: string } | null;
  }>;
  departures: Array<{
    id: string;
    room_types: { name: string } | null;
    users: { full_name: string } | null;
  }>;
  maintenance: Array<{ room_number: string; notes: string }>;
}

// --- COMPONENT PROPS TYPES ---
interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  // FIX: Explicit color classes for perfect contrast
  bgClass: string; // e.g. "bg-green-100"
  textClass: string; // e.g. "text-green-600"
  borderClass: string; // e.g. "border-green-200" (optional highlight)
  subtext?: string;
  alert?: boolean;
}

interface LogisticsCardProps {
  title: string;
  icon: LucideIcon;
  count: number;
  emptyMessage: string;
  children: React.ReactNode;
}

interface ShortcutLinkProps {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function AdminDashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch("/api/admin/overview");
        if (!res.ok) throw new Error("Failed to load data");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
        toast.error("Could not load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center -mt-16">
        <Loader2 className="w-10 h-10 animate-spin text-[#0A1A44]" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 font-sans">
      {/* 1. WELCOME & QUICK STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link href="/admin/bookings?new=true">
            <button className="flex items-center gap-2 bg-[#0A1A44] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-900 transition-transform hover:-translate-y-0.5">
              <PlusCircle className="w-4 h-4" /> New Booking
            </button>
          </Link>
          {/* <button className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors">
            <QrCode className="w-4 h-4" /> Scan Pass
          </button> */}
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="Today's Revenue"
          value={`₱${(data.revenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend="+12% from yesterday"
          bgClass="bg-green-100"
          textClass="text-green-600"
          borderClass="border-green-200"
        />
        <KpiCard
          label="Active Guests"
          value={(data.activeGuests || 0).toString()}
          icon={Users}
          bgClass="bg-blue-100"
          textClass="text-blue-600"
          borderClass="border-blue-200"
          subtext="Checked-in right now"
        />
        <KpiCard
          label="Action Items"
          value={(data.actionItems || 0).toString()}
          icon={Bell}
          bgClass="bg-orange-100"
          textClass="text-orange-600"
          borderClass="border-orange-200"
          subtext={`${data.pendingBookings || 0} Pending, ${
            data.newInquiries || 0
          } Inquiries`}
          alert={(data.actionItems || 0) > 0}
        />
        <KpiCard
          label="Inventory Alerts"
          value={(data.lowStockCount || 0).toString()}
          icon={AlertTriangle}
          bgClass="bg-red-100"
          textClass="text-red-600"
          borderClass="border-red-200"
          subtext="Items below minimum stock"
          alert={(data.lowStockCount || 0) > 0}
        />
      </div>

      {/* 3. LOGISTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Arrivals Column */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <LogisticsCard
            title="Arriving Today"
            icon={LogIn}
            count={data.arrivals.length}
            emptyMessage="No arrivals scheduled."
          >
            {data.arrivals.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    {booking.users?.full_name?.charAt(0) || "G"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {booking.users?.full_name || "Guest"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.room_types?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block">
                    PAX
                  </span>
                  <span className="text-sm font-bold text-[#0A1A44]">
                    {booking.guests_count}
                  </span>
                </div>
              </div>
            ))}
          </LogisticsCard>

          <LogisticsCard
            title="Departing Today"
            icon={LogOut}
            count={data.departures.length}
            emptyMessage="No departures today."
          >
            {data.departures.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                    OUT
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {booking.users?.full_name || "Guest"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.room_types?.name}
                    </p>
                  </div>
                </div>
                <button className="text-xs font-bold text-blue-600 hover:underline">
                  View
                </button>
              </div>
            ))}
          </LogisticsCard>
        </div>

        {/* System Health / Maintenance Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Maintenance Status
            </h3>

            {data.maintenance.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-medium">All systems operational</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.maintenance.map((room, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-700">
                        Room {room.room_number}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {room.notes || "Under maintenance"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                Quick Shortcuts
              </h4>
              <div className="space-y-2">
                <ShortcutLink
                  label="Log Expense"
                  href="/admin/billing"
                  icon={FilePlus}
                />
                <ShortcutLink
                  label="View Staff Roster"
                  href="/admin/staff"
                  icon={Users}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  bgClass,
  textClass,
  subtext,
  alert,
}: KpiCardProps) {
  return (
    <div
      className={`
      relative overflow-hidden bg-white p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg
      ${
        alert
          ? "border-orange-200 ring-4 ring-orange-50"
          : "border-slate-100 shadow-sm"
      }
    `}
    >
      {/* Decorative Blur Circle - Using same colors for theme consistency */}
      <div
        className={`absolute right-0 top-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-20 ${bgClass}`}
      ></div>

      <div className="flex items-start justify-between mb-4 relative z-10">
        {/* ICON CONTAINER: Using explicit classes passed from parent */}
        <div className={`p-3 rounded-xl ${bgClass} ${textClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        {alert && (
          <span className="flex h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <h3 className="text-3xl font-serif font-bold text-[#0A1A44]">
          {value}
        </h3>
        {subtext && (
          <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
        )}
        {trend && (
          <p className="text-xs text-green-500 mt-2 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {trend}
          </p>
        )}
      </div>
    </div>
  );
}

function LogisticsCard({
  title,
  icon: Icon,
  count,
  emptyMessage,
  children,
}: LogisticsCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
        </h3>
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">
          {count}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {count === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm py-4 italic border-2 border-dashed border-slate-100 rounded-xl">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>

      {count > 0 && (
        <button className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-[#0A1A44] flex items-center justify-center gap-1 transition-colors">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function ShortcutLink({ label, href, icon: Icon }: ShortcutLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100"
    >
      <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-white group-hover:shadow-sm transition-all">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-bold text-slate-600 group-hover:text-[#0A1A44]">
        {label}
      </span>
      <ArrowRight className="w-3 h-3 text-slate-300 ml-auto group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
    </Link>
  );
}
