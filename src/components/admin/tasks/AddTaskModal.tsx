"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type StaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  status: string;
};

type ShiftData = {
  staff_id: number;
  shift_type: string;
};

type Room = {
  id: string;
  room_number: string;
  status: string;
};

// Calculate PHT immediately so we can use it as the default state
const getPHTDate = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default function AddTaskModal({
  isOpen,
  onClose,
  onSuccess,
}: AddTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");

  const [shiftsForDate, setShiftsForDate] = useState<Record<string, string>>(
    {},
  );
  const [isFetchingShifts, setIsFetchingShifts] = useState(false);
  const [activeTasksCount, setActiveTasksCount] = useState<
    Record<string, number>
  >({});

  const [taskCategory, setTaskCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [staffId, setStaffId] = useState("");

  // 🔒 FIX 1: Auto-fill to Today (PHT). It will NEVER be empty now.
  const [dueDate, setDueDate] = useState(getPHTDate());

  useEffect(() => {
    if (isOpen) {
      // Reset form state when opened
      setTitle("");
      setDescription("");
      setStaffId("");
      setRoomId("");
      setTaskCategory("general");
      setDueDate(getPHTDate());

      fetch("/api/admin/staff")
        .then((res) => res.json())
        .then((data: StaffMember[]) => {
          const nonAdmins = data.filter(
            (s) =>
              s.status === "active" &&
              !s.position.toLowerCase().includes("admin") &&
              !s.position.toLowerCase().includes("manager"),
          );
          setStaffList(nonAdmins || []);
        })
        .catch((err) => console.error("Failed to load staff", err));

      const fetchRoomsAndWorkloads = async () => {
        const supabase = createClient();

        const { data: roomData } = await supabase
          .from("room_inventory")
          .select("id, room_number, status")
          .order("room_number");
        if (roomData) setRooms(roomData);

        const { data: tasksData } = await supabase
          .from("staff_tasks")
          .select("staff_id, status")
          .in("status", ["pending", "in_progress"]);

        if (tasksData) {
          const counts: Record<string, number> = {};
          tasksData.forEach((task) => {
            counts[task.staff_id] = (counts[task.staff_id] || 0) + 1;
          });
          setActiveTasksCount(counts);
        }
      };

      fetchRoomsAndWorkloads();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!dueDate) return;

    setIsFetchingShifts(true);
    fetch(`/api/admin/shifts?start=${dueDate}&end=${dueDate}`)
      .then((res) => res.json())
      .then((data: ShiftData[]) => {
        const shiftMap: Record<string, string> = {};

        const nowPHT = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
        );
        const currentHourPHT = nowPHT.getHours();
        const todayPHTStr = getPHTDate();

        let activeShiftBlock = "night";
        if (currentHourPHT >= 6 && currentHourPHT < 14)
          activeShiftBlock = "day";
        else if (currentHourPHT >= 14 && currentHourPHT < 22)
          activeShiftBlock = "mid";

        const isToday = dueDate === todayPHTStr;

        if (Array.isArray(data)) {
          data.forEach((shift) => {
            if (shift.shift_type !== "off") {
              const sType = shift.shift_type.toLowerCase();
              let normalizedShift = "day";
              if (sType.includes("mid") || sType.includes("afternoon"))
                normalizedShift = "mid";
              if (sType.includes("night") || sType.includes("grave"))
                normalizedShift = "night";

              if (isToday) {
                // If it's today, ONLY show them if they are working RIGHT NOW
                if (normalizedShift === activeShiftBlock) {
                  shiftMap[String(shift.staff_id)] = shift.shift_type;
                }
              } else {
                // Future dates show scheduled staff
                shiftMap[String(shift.staff_id)] = shift.shift_type;
              }
            }
          });
        }
        setShiftsForDate(shiftMap);
      })
      .catch((err) => console.error("Failed to load shifts", err))
      .finally(() => setIsFetchingShifts(false));
  }, [dueDate]);

  useEffect(() => {
    if (taskCategory === "general") {
      setTitle((currentTitle) =>
        currentTitle.startsWith("[CLEANING]") ||
        currentTitle.startsWith("[MAINTENANCE]")
          ? ""
          : currentTitle,
      );
      return;
    }

    const roomName =
      rooms.find((r) => r.id === roomId)?.room_number || "Facility";
    setTitle(`[${taskCategory.toUpperCase()}] - ${roomName}`);
  }, [taskCategory, roomId, rooms]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !staffId) {
      toast.error("Title and Assignee are required");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Assigning task...");

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          staff_id: staffId,
          priority: "medium",
          due_date: dueDate || null,
          room_id: roomId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to assign task");

      toast.success("Task assigned successfully!", { id: toastId });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const scheduledStaff = staffList.filter((s) => shiftsForDate[s.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return "🟢";
      case "occupied":
        return "🔴";
      case "cleaning":
        return "🟡";
      case "maintenance":
        return "🟠";
      case "out_of_order":
        return "⚫";
      default:
        return "⚪";
    }
  };

  const formatStatusText = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Assign New Task
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="general">General Task</option>
                <option value="cleaning">🧹 Housekeeping</option>
                <option value="maintenance">🔧 Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Related Room
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">No specific room</option>
                {rooms.map((room) => {
                  const isOccupied = room.status === "occupied";
                  return (
                    <option key={room.id} value={room.id} disabled={isOccupied}>
                      {room.room_number} — {formatStatusText(room.status)}{" "}
                      {getStatusIcon(room.status)}
                    </option>
                  );
                })}
              </select>
              <div className="mt-1.5 flex gap-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                <span>🟢 Avail</span>
                <span>🔴 Occ</span>
                <span>🟡 Clean</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-[#0A1A44]"
              placeholder="e.g. Deep clean Cottage 4"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Due Date
            </label>
            <input
              type="date"
              min={getPHTDate()}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-1">
              <span>
                Assign To <span className="text-red-500">*</span>
              </span>
              {isFetchingShifts && (
                <span className="text-blue-500 normal-case animate-pulse">
                  Checking schedule...
                </span>
              )}
            </label>
            <select
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="" disabled>
                Select a staff member...
              </option>

              {/* 🔒 FIX 2: Completely deleted the "All Active Staff" bypass. Strict enforcement only. */}
              {scheduledStaff.length > 0 ? (
                <optgroup
                  label={`🟢 ON DUTY ${dueDate === getPHTDate() ? "RIGHT NOW" : "THIS DAY"}`}
                >
                  {scheduledStaff.map((staff) => {
                    const count = activeTasksCount[staff.id] || 0;
                    const indicator = count > 0 ? "🔴" : "🟢";
                    return (
                      <option key={staff.id} value={staff.id}>
                        {indicator} {staff.first_name} {staff.last_name} (
                        {shiftsForDate[staff.id].toUpperCase()}) — {count}{" "}
                        Active Task{count !== 1 ? "s" : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ) : (
                <option value="" disabled>
                  No staff actively on shift at this time.
                </option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Add details about the task..."
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A1A44] hover:bg-blue-900 text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Assign Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
