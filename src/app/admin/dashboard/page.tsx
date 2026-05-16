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
  Eye,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import BookingTimeline from "@/components/admin/BookingTimeline";

// --- DATA TYPES ---
interface DashboardData {
  revenue: number;
  expenses: number; // 🔒 ADD THIS
  netProfit: number;
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
  bgClass: string;
  textClass: string;
  borderClass: string;
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
        </div>
      </div>

      {/* 2. KPI CARDS (Wrapped in Links) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* NET PROFIT -> Billing */}
        <Link href="/admin/billing" className="group">
          <KpiCard
            label="Today's Net Profit"
            value={`₱${(data.netProfit || 0).toLocaleString()}`}
            icon={DollarSign}
            subtext={`Gross: ₱${(data.revenue || 0).toLocaleString()} | Exp: ₱${(data.expenses || 0).toLocaleString()}`}
            bgClass={data.netProfit >= 0 ? "bg-green-100" : "bg-red-100"}
            textClass={data.netProfit >= 0 ? "text-green-600" : "text-red-600"}
            borderClass={
              data.netProfit >= 0 ? "border-green-200" : "border-red-200"
            }
          />
        </Link>

        {/* ACTIVE GUESTS -> Customers */}
        <Link href="/admin/customers" className="group">
          <KpiCard
            label="Active Guests"
            value={(data.activeGuests || 0).toString()}
            icon={Users}
            bgClass="bg-blue-100"
            textClass="text-blue-600"
            borderClass="border-blue-200"
            subtext="Checked-in right now"
          />
        </Link>

        {/* ACTION ITEMS -> Bookings */}
        <Link href="/admin/bookings?status=Pending" className="group">
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
        </Link>

        {/* INVENTORY ALERTS -> Inventory */}
        <Link href="/admin/inventory" className="group">
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
        </Link>
      </div>

      {/* 3. BOOKING TIMELINE — Gantt Command Center */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <BookingTimeline />
      </div>

      {/* 4. LOGISTICS GRID */}
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
              <Link
                key={booking.id}
                href={`/admin/bookings?booking=${encodeURIComponent(booking.id)}`}
                className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/60 transition-colors group"
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
                <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View
                </span>
              </Link>
            ))}
          </LogisticsCard>

          <LogisticsCard
            title="Departing Today"
            icon={LogOut}
            count={data.departures.length}
            emptyMessage="No departures today."
          >
            {data.departures.map((booking) => (
              <Link
                key={booking.id}
                href={`/admin/bookings?booking=${encodeURIComponent(booking.id)}`}
                className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/60 transition-colors group"
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
                <span className="text-xs font-bold text-blue-600 inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View
                </span>
              </Link>
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
                  <Link
                    key={idx}
                    href="/admin/room-status"
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
                  </Link>
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
      relative overflow-hidden bg-white p-6 rounded-2xl border transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1 cursor-pointer
      ${
        alert
          ? "border-orange-200 ring-4 ring-orange-50"
          : "border-slate-100 shadow-sm"
      }
    `}
    >
      {/* Decorative Blur Circle */}
      <div
        className={`absolute right-0 top-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-20 ${bgClass}`}
      ></div>

      <div className="flex items-start justify-between mb-4 relative z-10">
        {/* ICON CONTAINER */}
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
        <Link href="/admin/bookings" className="block mt-6">
          <button className="w-full py-3 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100 hover:bg-[#0A1A44] hover:text-white hover:border-[#0A1A44] transition-all flex items-center justify-center gap-2">
            View All Bookings <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
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
