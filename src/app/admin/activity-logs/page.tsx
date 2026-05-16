"use client";

import ActivityLogsReport, {
  ActivityLogReportFilters,
} from "@/components/pdf/ActivityLogsReport";
import { pdf } from "@react-pdf/renderer";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  History,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  ip_address: string | null;
  device_info: string | null;
  users: {
    full_name: string;
    email: string;
    role: string;
  } | null;
}

interface ActivityLogResponse {
  data: ActivityLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const roleOptions = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "front_desk", label: "Front Desk" },
  { value: "staff", label: "Staff" },
];

const pageSizeOptions = [10, 25, 50, 100];

const buildParams = (
  filters: ActivityLogReportFilters,
  page: number,
  pageSize: number,
) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.action) params.set("action", filters.action);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);

  return params;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<ActivityLogReportFilters>({
    search: "",
    role: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(filters, page, pageSize);
      const res = await fetch(`/api/admin/activity-logs?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load logs");
      }

      const result = (await res.json()) as ActivityLogResponse;
      setLogs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilter = (key: keyof ActivityLogReportFilters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({
      search: "",
      role: "",
      action: "",
      startDate: "",
      endDate: "",
    });
  };

  const fetchAllFilteredLogs = async () => {
    const firstParams = buildParams(filters, 1, 1000);
    const firstRes = await fetch(
      `/api/admin/activity-logs?${firstParams.toString()}`,
    );

    if (!firstRes.ok) {
      const data = await firstRes.json().catch(() => null);
      throw new Error(data?.error || "Failed to export logs");
    }

    const firstPage = (await firstRes.json()) as ActivityLogResponse;
    const allLogs = [...firstPage.data];

    for (let nextPage = 2; nextPage <= firstPage.totalPages; nextPage += 1) {
      const params = buildParams(filters, nextPage, 1000);
      const res = await fetch(`/api/admin/activity-logs?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to export all logs");
      }

      const result = (await res.json()) as ActivityLogResponse;
      allLogs.push(...result.data);
    }

    return allLogs;
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const toastId = toast.loading("Creating activity logs PDF...");

    try {
      const exportLogs = await fetchAllFilteredLogs();
      const generatedAt = new Date().toISOString();
      const blob = await pdf(
        <ActivityLogsReport
          logs={exportLogs}
          filters={filters}
          generatedAt={generatedAt}
        />,
      ).toBlob();

      downloadBlob(
        blob,
        `activity-logs-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success("Activity logs PDF created", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create PDF",
        { id: toastId },
      );
    } finally {
      setExporting(false);
    }
  };

  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F0F8FF] p-8 -m-6 font-sans text-slate-800">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            System Activity Logs
          </h1>
          <p className="text-slate-500 text-sm">
            Audit trail of all admin actions and system events.
          </p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting || loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1A44] text-white text-sm font-bold shadow-sm hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[#0A1A44]">
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              placeholder="Search action, user, IP..."
              value={filters.search || ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 ring-blue-100 outline-none"
            />
          </div>

          <input
            placeholder="Action contains..."
            value={filters.action || ""}
            onChange={(event) => updateFilter("action", event.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 ring-blue-100 outline-none"
          />

          <select
            value={filters.role || ""}
            onChange={(event) => updateFilter("role", event.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 ring-blue-100 outline-none"
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(event) => updateFilter("startDate", event.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 ring-blue-100 outline-none"
          />

          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(event) => updateFilter("endDate", event.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 ring-blue-100 outline-none"
          />
        </div>

        <div className="mt-3 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <p className="text-xs text-slate-500">
            PDF export uses the same filters and includes all matching records.
          </p>
          <button
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-200" />
            <span>Loading history...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No activity logs match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:px-8 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                <div
                  className={`p-2.5 rounded-full shrink-0 ${
                    log.action.includes("Delete") ||
                    log.action.includes("Reject")
                      ? "bg-red-50 text-red-500"
                      : log.action.includes("Update")
                        ? "bg-orange-50 text-orange-500"
                        : "bg-blue-50 text-blue-500"
                  }`}
                >
                  {log.action.includes("Security") ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <History className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {log.action}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.users?.full_name || "System/Unknown"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        log.users?.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : log.users?.role === "front_desk"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Role: {log.users?.role || "unknown"}
                    </span>
                    <span className="font-mono bg-slate-100 px-1.5 rounded">
                      {log.ip_address || "IP Hidden"}
                    </span>
                  </div>
                  {log.device_info && (
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {log.device_info}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-bold text-slate-700">
            {firstItem}-{lastItem}
          </span>{" "}
          of <span className="font-bold text-slate-700">{total}</span> logs
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={pageSize}
            onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value));
            }}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-600 min-w-24 text-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
