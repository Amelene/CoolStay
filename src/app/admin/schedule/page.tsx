"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Loader2, Sun, Sunset, Moon } from "lucide-react";

interface Shift {
  id: number;
  shift_date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface ScheduleData {
  staff: { id: number; name: string; position: string };
  shifts: Shift[];
}

const SHIFT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  morning: { label: "Morning Shift", icon: <Sun    className="w-4 h-4" />, color: "bg-amber-100 text-amber-700 border-amber-200" },
  mid:     { label: "Mid Shift",     icon: <Sunset className="w-4 h-4" />, color: "bg-blue-100 text-blue-700 border-blue-200" },
  night:   { label: "Night Shift",   icon: <Moon   className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  regular: { label: "Regular Shift", icon: <Clock  className="w-4 h-4" />, color: "bg-green-100 text-green-700 border-green-200" },
};

export default function MySchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/schedule")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError("Failed to load schedule"))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A1A44] flex items-center gap-2">
          <CalendarDays className="w-6 h-6" /> My Schedule
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {data?.staff ? `Upcoming shifts for ${data.staff.name} · ${data.staff.position}` : "Your upcoming shifts for the next 30 days"}
        </p>
      </div>

      {/* States */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-400">
          <p className="font-semibold">{error}</p>
          <p className="text-sm mt-1 text-slate-400">Your staff account may not be fully linked yet. Contact your admin.</p>
        </div>
      ) : !data || data.shifts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No upcoming shifts scheduled.</p>
          <p className="text-sm mt-1">Contact your manager if you think this is a mistake.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.shifts.map((shift) => {
            const cfg = SHIFT_CONFIG[shift.shift_type] ?? SHIFT_CONFIG.regular;
            const isToday = shift.shift_date === todayStr;

            return (
              <div
                key={shift.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border bg-white shadow-sm ${
                  isToday ? "ring-2 ring-blue-400 shadow-blue-100" : ""
                }`}
              >
                {/* Date block */}
                <div className="text-center min-w-[56px]">
                  <div className="text-2xl font-bold text-[#0A1A44]">
                    {new Date(shift.shift_date + "T00:00:00").getDate()}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {new Date(shift.shift_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">TODAY</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-medium">
                    {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(shift.shift_date)}</p>
                </div>

                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  shift.status === "completed"  ? "bg-green-100 text-green-700" :
                  shift.status === "in_progress"? "bg-blue-100 text-blue-700"  :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {shift.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
