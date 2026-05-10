"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  Download,
  FileText,
  RefreshCcw,
  Loader2,
  Receipt,
  Wallet,
  BarChart3,
  Sparkles,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import AnalyticsReport, { ReportData } from "@/components/pdf/AnalyticsReport";

// --- TYPES ---
type AnalyticsData = {
  kpi: {
    totalRevenue:        number;
    totalExpenses:       number;
    netProfit:           number;
    totalPayroll:        number;
    currentMonthRevenue: number;
    currentMonthLabel:   string;
    totalBookings:       number;
    activeGuests:        number;
    avgRating:           number;
  };
  revenueChart:   { name: string; total: number }[];
  roomPopularity: { name: string; bookings: number; color: string }[];
  recentReports: {
    id: string;
    report_type: string;
    time_range: string;
    generated_at: string;
    success: boolean;
    report_content: string;
  }[];
};

// --- KPI CARD VARIANTS ---
type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;       // Tailwind bg class for icon bg
  textAccent: string;   // Tailwind text class for value
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  fullWidth?: boolean;
};

const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  textAccent,
  trend,
  trendLabel,
}: KpiCardProps) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && trendLabel && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
          trend === "up"   ? "bg-emerald-50 text-emerald-600" :
          trend === "down" ? "bg-red-50 text-red-500"         :
                             "bg-slate-100 text-slate-500"
        }`}>
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendLabel}
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
      <p className={`text-2xl font-serif font-bold ${textAccent} leading-none`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtitle}</p>
    </div>
  </div>
);

// --- HERO KPI (large featured card) ---
type HeroKpiProps = {
  title: string;
  value: string;
  sub: string;
  badge?: string;
  positive?: boolean;
};

const HeroKpi = ({ title, value, sub, badge, positive = true }: HeroKpiProps) => (
  <div className={`relative rounded-2xl p-6 overflow-hidden flex flex-col gap-2 ${positive ? "bg-gradient-to-br from-[#0A1A44] to-[#1a3a6e]" : "bg-gradient-to-br from-rose-600 to-rose-800"} text-white shadow-lg`}>
    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
    <div className="relative z-10">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">{title}</p>
      <p className="text-3xl font-serif font-bold mt-1">{value}</p>
      <p className="text-xs text-white/60 mt-1 font-medium">{sub}</p>
      {badge && (
        <span className="inline-block mt-3 text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
  </div>
);

export default function ReportsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [revenueRange, setRevenueRange] = useState("year");
  const [roomsRange, setRoomsRange] = useState("year");
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [revenueMonth, setRevenueMonth] = useState(currentMonthStr);
  const [roomsMonth, setRoomsMonth] = useState(currentMonthStr);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        revenue_range: revenueRange,
        revenue_date: revenueMonth,
        rooms_range: roomsRange,
        rooms_date: roomsMonth,
      });
      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenueRange, roomsRange, revenueMonth, roomsMonth]);

  const handleGenerateReport = async () => {
    if (!data) return;
    setIsGenerating(true);
    const toastId = toast.loading("Generating report...");
    try {
      const label = `${revenueRange.toUpperCase()} VIEW (${revenueRange === "month" ? revenueMonth : new Date().getFullYear()})`;
      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpi: data.kpi,
          revenueChart: data.revenueChart,
          roomPopularity: data.roomPopularity,
          rangeLabel: label,
        }),
      });
      if (!res.ok) throw new Error("Failed to save report");
      toast.success("Report generated and saved!", { id: toastId });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadOldReport = async (reportContent: string, id: string) => {
    setDownloadingId(id);
    const toastId = toast.loading("Preparing download...");
    try {
      const parsedData: ReportData = JSON.parse(reportContent);
      const blob = await pdf(<AnalyticsReport data={parsedData} />).toBlob();
      saveAs(blob, `CoolStay_Report_${id.slice(0, 8)}.pdf`);
      toast.dismiss(toastId);
    } catch (e) {
      console.error(e);
      toast.error("Could not download report. Data corrupted.", { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  if (!data && isLoading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <RefreshCcw className="w-8 h-8 animate-spin" />
        <p className="font-semibold">Loading analytics…</p>
      </div>
    );

  if (!data)
    return (
      <div className="p-10 text-center text-red-500 font-semibold">
        Failed to load analytics.
      </div>
    );

  const phl = (n: number) => `₱ ${n.toLocaleString()}`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F4F7FB] p-6 -m-6 font-sans">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44] flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-500" />
            Analytics &amp; Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">Live performance metrics across all business areas.</p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || isLoading}
          className="bg-[#0A1A44] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Generate PDF Report
        </button>
      </div>

      {/* ── FINANCIAL HERO ROW ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <HeroKpi
          title="Total Revenue"
          value={phl(data.kpi.totalRevenue)}
          sub={revenueRange === "year" ? `Full year ${new Date().getFullYear()}` : "Selected period"}
          badge="Gross income"
          positive={true}
        />
        <HeroKpi
          title={data.kpi.currentMonthLabel}
          value={phl(data.kpi.currentMonthRevenue)}
          sub="Confirmed payments this calendar month"
          badge="Live"
          positive={true}
        />
        <HeroKpi
          title="Net Profit"
          value={phl(data.kpi.netProfit)}
          sub="Revenue minus operational expenses"
          badge={data.kpi.netProfit >= 0 ? "Positive margin" : "Deficit"}
          positive={data.kpi.netProfit >= 0}
        />
      </div>

      {/* ── SECONDARY KPI ROW ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Operational Expenses"
          value={phl(data.kpi.totalExpenses)}
          subtitle={revenueRange === "year" ? "Annual period" : "Selected period"}
          icon={Receipt}
          accent="bg-red-100 text-red-600"
          textAccent="text-red-600"
          trend="down"
          trendLabel="Costs"
        />
        <KpiCard
          title="Monthly Payroll"
          value={phl(data.kpi.totalPayroll)}
          subtitle="All active staff salaries"
          icon={Wallet}
          accent="bg-violet-100 text-violet-600"
          textAccent="text-violet-700"
          trend="neutral"
          trendLabel="Fixed"
        />
        <KpiCard
          title="Total Bookings"
          value={data.kpi.totalBookings.toString()}
          subtitle={revenueRange === "year" ? "This year" : "Selected period"}
          icon={CalendarDays}
          accent="bg-blue-100 text-blue-600"
          textAccent="text-blue-700"
          trend="up"
          trendLabel="Active"
        />
        <KpiCard
          title="Active Guests"
          value={data.kpi.activeGuests.toString()}
          subtitle="Currently checked-in"
          icon={Users}
          accent="bg-amber-100 text-amber-600"
          textAccent="text-amber-700"
          trend="neutral"
          trendLabel="Live"
        />
      </div>

      {/* ── CHARTS ROW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Revenue Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <RefreshCcw className="w-5 h-5 animate-spin text-[#0A1A44]" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-[#0A1A44]">Revenue Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Confirmed payment inflows over time</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {revenueRange === "month" && (
                <input
                  type="month"
                  value={revenueMonth}
                  onChange={(e) => setRevenueMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold px-2 py-1.5 text-slate-700 outline-none"
                />
              )}
              <select
                value={revenueRange}
                onChange={(e) => setRevenueRange(e.target.value)}
                className="bg-slate-100 rounded-lg text-xs font-bold px-3 py-1.5 text-slate-600 outline-none uppercase tracking-wide cursor-pointer"
              >
                <option value="week">This Week</option>
                <option value="month">Monthly</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueChart}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `₱${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Popularity Chart */}
        <div className="bg-[#0A1A44] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-500 rounded-full blur-3xl opacity-20" />
          <div className="flex flex-col gap-2 mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Popular Rooms</h3>
              <Sparkles className="w-4 h-4 text-blue-300" />
            </div>
            <div className="flex flex-wrap gap-2">
              {roomsRange === "month" && (
                <input
                  type="month"
                  value={roomsMonth}
                  onChange={(e) => setRoomsMonth(e.target.value)}
                  className="flex-1 min-w-[120px] bg-white/10 border border-white/20 rounded-lg text-xs font-bold px-2 py-1.5 text-white outline-none"
                />
              )}
              <select
                value={roomsRange}
                onChange={(e) => setRoomsRange(e.target.value)}
                className="flex-1 min-w-[100px] bg-white/10 rounded-lg text-xs font-bold px-3 py-1.5 text-white outline-none uppercase tracking-wide cursor-pointer"
              >
                <option value="week"  className="text-slate-800">This Week</option>
                <option value="month" className="text-slate-800">Monthly</option>
                <option value="year"  className="text-slate-800">This Year</option>
              </select>
            </div>
          </div>
          <div className="flex-1 min-h-[200px] relative z-10">
            {data.roomPopularity.length === 0 ? (
              <div className="h-full flex items-center justify-center text-blue-200 italic text-sm">
                No bookings in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.roomPopularity} layout="vertical" barSize={16}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", color: "#000", fontSize: 12 }} />
                  <Bar dataKey="bookings" radius={[0, 6, 6, 0]}>
                    {data.roomPopularity.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? "#ffffff" : "#60a5fa"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── FINANCIAL SUMMARY STRIP ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Avg. Guest Rating",
            value: `${data.kpi.avgRating} / 5.0`,
            icon: BarChart3,
            color: "bg-emerald-50 border-emerald-100",
            text: "text-emerald-700",
            icon_bg: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Payroll vs Revenue",
            value: data.kpi.totalRevenue > 0
              ? `${((data.kpi.totalPayroll / data.kpi.totalRevenue) * 100).toFixed(1)}%`
              : "—",
            icon: DollarSign,
            color: "bg-violet-50 border-violet-100",
            text: "text-violet-700",
            icon_bg: "bg-violet-100 text-violet-600",
          },
          {
            label: "Profit Margin",
            value: data.kpi.totalRevenue > 0
              ? `${((data.kpi.netProfit / data.kpi.totalRevenue) * 100).toFixed(1)}%`
              : "—",
            icon: data.kpi.netProfit >= 0 ? TrendingUp : TrendingDown,
            color: data.kpi.netProfit >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100",
            text: data.kpi.netProfit >= 0 ? "text-blue-700" : "text-red-700",
            icon_bg: data.kpi.netProfit >= 0 ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600",
          },
        ].map((item) => (
          <div key={item.label} className={`${item.color} border rounded-2xl p-4 flex items-center gap-4`}>
            <div className={`${item.icon_bg} p-3 rounded-xl`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className={`text-xl font-serif font-bold ${item.text}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── RECENT REPORTS TABLE ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#0A1A44]">Generated Reports</h3>
            <p className="text-xs text-slate-400 mt-0.5">Download previously generated PDF snapshots</p>
          </div>
          <button
            onClick={fetchData}
            className="text-sm font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {data.recentReports.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No reports generated yet.</p>
            <p className="text-sm mt-1">Use the &quot;Generate PDF Report&quot; button above to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/70">
                  <th className="py-3 pl-6 pr-4">Report ID</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Period</th>
                  <th className="py-3 pr-4">Generated</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentReports.map((report) => (
                  <tr key={report.id} className="group hover:bg-blue-50/40 transition-colors">
                    <td className="py-4 pl-6 pr-4 font-mono text-xs text-slate-500">
                      {report.id.substring(0, 8)}…
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold text-[#0A1A44]">{report.report_type}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-xs font-bold text-slate-500 uppercase">
                      {report.time_range || "—"}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-500">
                      {new Date(report.generated_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        report.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {report.success ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {report.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <button
                        onClick={() => handleDownloadOldReport(report.report_content, report.id)}
                        disabled={downloadingId === report.id}
                        title="Download PDF"
                        className="p-2 rounded-lg text-slate-400 hover:text-[#0A1A44] hover:bg-blue-100 transition-colors disabled:opacity-40"
                      >
                        {downloadingId === report.id
                          ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          : <Download className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
