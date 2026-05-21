"use client";

import React, { useEffect, useState } from "react";
import StaffModal from "@/components/admin/StaffModal";
import {
  Plus,
  Trash2,
  Edit2,
  Briefcase,
  Mail,
  Phone,
  Search,
  BadgeCheck,
  Ban,
  Users,
  Building2,
  CalendarDays,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

// --- TYPES ---
interface StaffMember {
  id: number;
  user_id?: string | null;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  salary: number;
  hire_date: string;
  system_role?: "admin" | "manager" | "front_desk" | "staff";
}

interface ShiftData {
  id: number;
  staff_id: number;
  shift_date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  status: string;
}

// --- HELPER FUNCTIONS ---
const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

// --- STATS COMPONENT ---
function StatBadge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4 flex-1 min-w-37.5">
      <div
        className={`p-3 rounded-xl ${color} text-white shadow-lg transform -rotate-3`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-2xl font-serif font-bold text-[#0A1A44]">{value}</p>
      </div>
    </div>
  );
}

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "schedule">(
    "directory",
  );
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Schedule State
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getStartOfWeek(today);
  });
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [shifts, setShifts] = useState<Record<string, string>>({}); // Key: "staffId_YYYY-MM-DD", Value: "shift_type"
  const [isUpdatingShift, setIsUpdatingShift] = useState<string | null>(null); // To show loading state per cell
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [bulkStartDate, setBulkStartDate] = useState(formatYMD(weekStart));
  const [bulkEndDate, setBulkEndDate] = useState(formatYMD(weekStart));
  const [bulkShiftType, setBulkShiftType] = useState("morning");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShifts = async (startStr: string, endStr: string) => {
    try {
      const res = await fetch(
        `/api/admin/shifts?start=${startStr}&end=${endStr}`,
      );
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data: ShiftData[] = await res.json();

      const shiftMap: Record<string, string> = {};
      data.forEach((shift) => {
        shiftMap[`${shift.staff_id}_${shift.shift_date}`] = shift.shift_type;
      });
      setShifts(shiftMap);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Could not load the schedule.");
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Update dates & fetch shifts whenever week changes
  useEffect(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setWeekDays(days);
    setBulkStartDate(formatYMD(days[0]));
    setBulkEndDate(formatYMD(days[6]));

    if (days.length > 0) {
      const startStr = formatYMD(days[0]);
      const endStr = formatYMD(days[6]);
      fetchShifts(startStr, endStr);
    }
  }, [weekStart]);

  const shiftWeek = (offset: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + offset);
    setWeekStart(newDate);
  };

  // --- HANDLERS ---
  const handleAdd = () => {
    setStaffToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (staff: StaffMember) => {
    setStaffToEdit(staff);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to remove this staff member? This action cannot be undone.",
      )
    )
      return;

    const toastId = toast.loading("Deleting staff member...");

    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      toast.dismiss(toastId);
      toast.success("Staff member removed successfully");
    } catch (error: unknown) {
      toast.dismiss(toastId);
      if (error instanceof Error) toast.error(error.message);
      else toast.error("An unknown error occurred");
    }
  };

  const handleShiftChange = async (
    staffId: number,
    dateStr: string,
    shiftType: string,
  ) => {
    const cellKey = `${staffId}_${dateStr}`;
    setIsUpdatingShift(cellKey);

    // Optimistic Update
    const prevShift = shifts[cellKey];
    setShifts((prev) => ({ ...prev, [cellKey]: shiftType }));

    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: staffId,
          shift_date: dateStr,
          shift_type: shiftType,
        }),
      });

      if (!res.ok) throw new Error("Failed to save shift");
      toast.success("Schedule updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update shift. Reverting.");
      // Revert optimistic update
      setShifts((prev) => {
        const newShifts = { ...prev };
        if (prevShift) newShifts[cellKey] = prevShift;
        else delete newShifts[cellKey];
        return newShifts;
      });
    } finally {
      setIsUpdatingShift(null);
    }
  };

  const activeScheduleStaff = staffList.filter((s) => s.status === "active");
  const visibleScheduleStaff = activeScheduleStaff.filter((staff) => {
    const query = scheduleSearchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      staff.first_name,
      staff.last_name,
      staff.employee_id,
      staff.position,
      staff.department,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const isAllActiveSelected =
    visibleScheduleStaff.length > 0 &&
    visibleScheduleStaff.every((staff) => selectedStaffIds.includes(staff.id));

  const toggleStaffSelection = (staffId: number) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId],
    );
  };

  const toggleAllActiveStaff = () => {
    const visibleIds = visibleScheduleStaff.map((staff) => staff.id);
    setSelectedStaffIds((prev) =>
      isAllActiveSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const handleBulkAssign = async () => {
    if (selectedStaffIds.length === 0) {
      toast.error("Select at least one staff member.");
      return;
    }

    if (!bulkStartDate || !bulkEndDate || bulkStartDate > bulkEndDate) {
      toast.error("Choose a valid date range.");
      return;
    }

    setIsBulkUpdating(true);
    const toastId = toast.loading("Applying bulk schedule...");

    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_ids: selectedStaffIds,
          start_date: bulkStartDate,
          end_date: bulkEndDate,
          shift_type: bulkShiftType,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to apply schedule");

      toast.success("Bulk schedule applied.", { id: toastId });
      if (weekDays[0] && weekDays[6]) {
        await fetchShifts(formatYMD(weekDays[0]), formatYMD(weekDays[6]));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply schedule",
        { id: toastId },
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // --- FILTERS & STATS ---
  const filteredStaff = staffList.filter(
    (staff) =>
      staff.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.position.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === "active").length;
  const totalDepartments = new Set(staffList.map((s) => s.department)).size;
  const todayStr = formatYMD(new Date());

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-8 -m-6 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-125 h-125 bg-blue-100/50 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-125 h-125 bg-indigo-100/50 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* 1. Header & Stats */}
      <div className="flex flex-col gap-8 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-black text-[#0A1A44] tracking-tight">
              Workforce
            </h1>
            <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
              Manage your most valuable assets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* TABS CONTROLS */}
            <div className="flex bg-white/60 p-1 rounded-xl shadow-sm border border-slate-200">
              <button
                onClick={() => setActiveTab("directory")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "directory"
                  ? "bg-[#0A1A44] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
              >
                <UserCircle className="w-4 h-4" /> Directory
              </button>
              <button
                onClick={() => setActiveTab("schedule")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "schedule"
                  ? "bg-[#0A1A44] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
              >
                <CalendarDays className="w-4 h-4" /> Schedule
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="group bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Onboard Staff
            </button>
          </div>
        </div>

        {activeTab === "directory" && (
          <div className="flex flex-wrap gap-4">
            <StatBadge
              label="Total Members"
              value={totalStaff}
              icon={Users}
              color="bg-blue-500"
            />
            <StatBadge
              label="Active Now"
              value={activeStaff}
              icon={BadgeCheck}
              color="bg-green-500"
            />
            <StatBadge
              label="Departments"
              value={totalDepartments}
              icon={Building2}
              color="bg-purple-500"
            />
          </div>
        )}
      </div>

      {/* 2. DIRECTORY VIEW */}
      {activeTab === "directory" && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-4 mb-8 bg-white/60 p-2 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none outline-none text-sm font-medium text-[#0A1A44] placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-white/50 rounded-3xl animate-pulse border border-white/60"
                />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-24 bg-white/40 rounded-4xl border-2 border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#0A1A44]">
                No staff found
              </h3>
              <p className="text-slate-400 text-sm">
                Try adjusting your search filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredStaff.map((staff) => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  onEdit={() => handleEdit(staff)}
                  onDelete={() => handleDelete(staff.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SCHEDULE VIEW */}
      {activeTab === "schedule" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Schedule Controls */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-[#0A1A44] text-white">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-300" /> Weekly Shift
              Scheduler
            </h2>
            <div className="flex items-center gap-2 bg-white/10 p-1 rounded-xl">
              <button
                onClick={() => shiftWeek(-7)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium w-44 text-center">
                {weekDays[0]?.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                —{" "}
                {weekDays[6]?.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <button
                onClick={() => shiftWeek(7)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_180px_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Search Staff
                </span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={scheduleSearchQuery}
                    onChange={(event) => setScheduleSearchQuery(event.target.value)}
                    placeholder="Name, ID, role..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  From
                </span>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(event) => setBulkStartDate(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  To
                </span>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(event) => setBulkEndDate(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Shift
                </span>
                <select
                  value={bulkShiftType}
                  onChange={(event) => setBulkShiftType(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="off">Off Duty</option>
                  <option value="morning">Morning</option>
                  <option value="mid">Mid</option>
                  <option value="night">Night</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  onClick={handleBulkAssign}
                  disabled={isBulkUpdating || selectedStaffIds.length === 0}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 lg:w-auto"
                >
                  {isBulkUpdating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Apply to {selectedStaffIds.length}
                </button>
              </div>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="relative overflow-x-auto">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No active staff members found.
              </div>
            ) : (
              <div className="min-w-max">
                {/* Header Row */}
                <div className="flex sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                  <div className="w-64 shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 p-4 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center shadow-[1px_0_0_#e2e8f0]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAllActiveSelected}
                        onChange={toggleAllActiveStaff}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Staff Member
                    </label>
                  </div>
                  {weekDays.map((day, i) => {
                    const dayStr = formatYMD(day);
                    const isToday = dayStr === todayStr;
                    return (
                      <div
                        key={i}
                        className={`w-40 shrink-0 p-3 text-center border-r border-slate-200 flex flex-col items-center justify-center ${isToday ? "bg-blue-50/50" : ""}`}
                      >
                        <span
                          className={`text-[11px] font-bold uppercase ${isToday ? "text-blue-600" : "text-slate-400"}`}
                        >
                          {day.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span
                          className={`text-sm font-black ${isToday ? "text-blue-700" : "text-slate-800"}`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Staff Rows */}
                <div className="flex flex-col pb-4">
                  {visibleScheduleStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex group hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                      >
                        {/* Name Column */}
                        <div className="w-64 shrink-0 sticky left-0 z-20 bg-white group-hover:bg-slate-50/80 border-r border-slate-200 p-4 flex items-center gap-3 shadow-[1px_0_0_#e2e8f0] transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedStaffIds.includes(staff.id)}
                            onChange={() => toggleStaffSelection(staff.id)}
                            className="h-4 w-4 rounded border-slate-300"
                            aria-label={`Select ${staff.first_name} ${staff.last_name}`}
                          />
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {staff.first_name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-700 truncate">
                              {staff.first_name} {staff.last_name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate">
                              {staff.position}
                            </p>
                          </div>
                        </div>

                        {/* Shift Cells */}
                        {weekDays.map((day, i) => {
                          const dayStr = formatYMD(day);
                          const cellKey = `${staff.id}_${dayStr}`;
                          const currentShift = shifts[cellKey] || "off";
                          const isUpdating = isUpdatingShift === cellKey;
                          const isToday = dayStr === todayStr;

                          // Dynamic colors based on shift type
                          let bgClass =
                            "bg-white border-slate-200 text-slate-500 hover:bg-slate-50";
                          if (currentShift === "morning")
                            bgClass =
                              "bg-sky-50 border-sky-300 text-sky-800 font-bold";
                          if (currentShift === "mid")
                            bgClass =
                              "bg-amber-50 border-amber-300 text-amber-800 font-bold";
                          if (currentShift === "night")
                            bgClass =
                              "bg-indigo-50 border-indigo-300 text-indigo-800 font-bold";

                          return (
                            <div
                              key={i}
                              className={`w-40 shrink-0 border-r border-slate-100 p-2 flex items-center justify-center relative ${isToday ? "bg-blue-50/20" : ""}`}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                              ) : (
                                <select
                                  value={currentShift}
                                  onChange={(e) =>
                                    handleShiftChange(
                                      staff.id,
                                      dayStr,
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full h-10 px-2 text-xs rounded-xl border appearance-none cursor-pointer outline-none transition-all shadow-sm ${bgClass}`}
                                  style={{ textAlignLast: "center" }}
                                >
                                  <option value="off">Off Duty</option>
                                  <option value="morning">
                                    Morning (6A-2P)
                                  </option>
                                  <option value="mid">Mid (2P-10P)</option>
                                  <option value="night">Night (10P-6A)</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <StaffModal
        isOpen={isModalOpen}
        staffToEdit={staffToEdit}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchStaff()}
      />
    </div>
  );
}

// --- SUBCOMPONENTS (UNMODIFIED) ---
function StaffCard({
  staff,
  onEdit,
  onDelete,
}: {
  staff: StaffMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deptColor =
    {
      "Front Desk": "bg-pink-500",
      Housekeeping: "bg-teal-500",
      Maintenance: "bg-orange-500",
      Management: "bg-[#0A1A44]",
      Security: "bg-slate-600",
    }[staff.department] || "bg-blue-500";
  const middleInitial =
    staff.middle_name && staff.middle_name.trim() !== ""
      ? `${staff.middle_name.trim().charAt(0).toUpperCase()}. `
      : "";
  const fullName =
    `${staff.first_name} ${middleInitial}${staff.last_name}`.trim();

  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100">
      <div className={`h-2 w-full ${deptColor}`} />
      <div className="p-6 relative">
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 bg-white text-[#0A1A44] rounded-xl shadow-md hover:bg-blue-50 border border-blue-100"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white text-red-500 rounded-xl shadow-md hover:bg-red-50 border border-red-100"
            title="Terminate"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-2xl ${deptColor} text-white flex items-center justify-center font-serif font-bold text-2xl shadow-lg transform group-hover:rotate-3 transition-transform`}
            >
              {staff.first_name?.charAt(0) || "?"}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-white rounded-full ${staff.status === "active" ? "bg-green-500" : staff.status === "terminated" ? "bg-red-500" : "bg-slate-400"}`}
            ></div>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3
              className="font-bold text-[#0A1A44] text-lg truncate leading-tight"
              title={fullName}
            >
              {fullName}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {staff.position}
            </p>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${deptColor} bg-opacity-90`}
            >
              {staff.department}
            </span>
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
              <BadgeCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Employee ID
              </p>
              <p className="text-xs font-mono font-bold text-slate-700">
                {staff.employee_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Email
              </p>
              <p
                className="text-xs font-medium text-slate-700 truncate"
                title={staff.email}
              >
                {staff.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Contact
              </p>
              <p className="text-xs font-medium text-slate-700">
                {staff.phone}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Hired {new Date(staff.hire_date).getFullYear()}</span>
          </div>
          {staff.status === "terminated" ? (
            <span className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">
              <Ban className="w-3 h-3" /> Terminated
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
              Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
