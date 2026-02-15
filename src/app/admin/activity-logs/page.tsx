"use client";

import { useEffect, useState } from "react";
import {
  History,
  Search,
  Loader2,
  User,
  ShieldAlert,
  CalendarClock,
} from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  ip_address: string;
  users: {
    full_name: string;
    email: string;
  } | null;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/admin/activity-logs");
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (error) {
        console.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.users?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F0F8FF] p-8 -m-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            System Activity Logs
          </h1>
          <p className="text-slate-500 text-sm">
            Audit trail of all admin actions and system events.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border-none bg-white shadow-sm text-sm focus:ring-2 ring-blue-100 outline-none w-64"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-200" />
            <span>Loading history...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:px-8 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                {/* Icon based on action type (Simple logic) */}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {log.action}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.users?.full_name || "System/Unknown"}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="font-mono bg-slate-100 px-1.5 rounded">
                      {log.ip_address || "IP Hidden"}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
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
    </div>
  );
}
