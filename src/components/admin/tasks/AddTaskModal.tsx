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

  const [taskCategory, setTaskCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [staffId, setStaffId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/admin/staff")
        .then((res) => res.json())
        .then((data: StaffMember[]) => {
          setStaffList(data.filter((s) => s.status === "active") || []);
        })
        .catch((err) => console.error("Failed to load staff", err));

      const fetchRooms = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("room_inventory")
          .select("id, room_number, status")
          .order("room_number");
        if (data) setRooms(data);
      };
      fetchRooms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!dueDate) {
      setShiftsForDate({});
      return;
    }

    setIsFetchingShifts(true);
    fetch(`/api/admin/shifts?start=${dueDate}&end=${dueDate}`)
      .then((res) => res.json())
      .then((data: ShiftData[]) => {
        const shiftMap: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach((shift) => {
            if (shift.shift_type !== "off") {
              shiftMap[String(shift.staff_id)] = shift.shift_type;
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
      if (title.startsWith("[CLEANING]") || title.startsWith("[MAINTENANCE]")) {
        setTitle("");
      }
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
          priority,
          due_date: dueDate || null,
          room_id: roomId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to assign task");

      toast.success("Task assigned successfully!", { id: toastId });

      setTitle("");
      setDescription("");
      setStaffId("");
      setPriority("medium");
      setDueDate("");
      setRoomId("");
      setTaskCategory("general");

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
  const unscheduledStaff = staffList.filter((s) => !shiftsForDate[s.id]);

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

  // Helper to make text look pretty (e.g., "out_of_order" -> "Out of order")
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
                    // 🔒 NEW: Disables the option if Occupied!
                    <option key={room.id} value={room.id} disabled={isOccupied}>
                      {room.room_number} — {formatStatusText(room.status)}{" "}
                      {getStatusIcon(room.status)}
                    </option>
                  );
                })}
              </select>

              {/* 🔒 NEW: The Room Legend */}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
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

              {dueDate && scheduledStaff.length > 0 && (
                <optgroup label="🟢 ON DUTY THIS DAY">
                  {scheduledStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name} (
                      {shiftsForDate[staff.id].toUpperCase()})
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup
                label={
                  dueDate ? "🔴 OFF DUTY / UNSCHEDULED" : "All Active Staff"
                }
              >
                {unscheduledStaff.map((staff) => (
                  // 🔒 NEW: Disables Off Duty staff if a due date is selected!
                  <option key={staff.id} value={staff.id} disabled={!!dueDate}>
                    {staff.first_name} {staff.last_name} ({staff.position})
                  </option>
                ))}
              </optgroup>
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
