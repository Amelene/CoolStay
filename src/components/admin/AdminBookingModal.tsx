"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Baby,
  Milk,
  Plus,
  Minus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RoomType {
  id: string;
  name: string;
  base_price: number;
}

// --- HELPER FUNCTIONS FOR CALENDAR ---
const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

export default function AdminBookingModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  // Form State
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Guest Counters
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Calendar State
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Rooms
  useEffect(() => {
    const fetchRooms = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("room_types")
        .select("id, name, base_price")
        .eq("is_active", true);
      if (data) setRoomTypes(data);
    };
    if (isOpen) fetchRooms();
  }, [isOpen]);

  // 2. Auto-Calculate Price (Read-Only Logic)
  useEffect(() => {
    if (roomId && checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const room = roomTypes.find((r) => r.id === roomId);

      if (room && diffDays > 0) {
        setTotalAmount(room.base_price * diffDays);
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [roomId, checkIn, checkOut, roomTypes]);

  // 3. Handle Outside Clicks for Calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- CALENDAR LOGIC ---
  const handleDateClick = (dateStr: string) => {
    if (!checkIn || (checkIn && checkOut && checkIn !== checkOut)) {
      setCheckIn(dateStr);
      setCheckOut("");
    } else if (checkIn && !checkOut) {
      if (dateStr < checkIn) {
        setCheckIn(dateStr);
      } else {
        setCheckOut(dateStr);
        setShowCalendar(false);
      }
    } else if (checkIn && checkOut && checkIn === checkOut) {
      setCheckIn(dateStr);
      setCheckOut("");
    }
  };

  const renderMonth = (offset: number) => {
    const targetDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + offset,
      1,
    );
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptySlots = Array.from({ length: firstDay }, (_, i) => i);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <div className="w-64 p-2">
        <div className="text-center font-bold text-[#0A1A44] mb-2 font-serif">
          {monthNames[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 font-bold mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptySlots.map((i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const todayStr = new Date().toISOString().split("T")[0];
            const isPast = dateStr < todayStr;
            const isSelected = dateStr === checkIn || dateStr === checkOut;
            const isInRange =
              checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;
            const isHoverRange =
              !checkOut &&
              checkIn &&
              hoverDate &&
              dateStr > checkIn &&
              dateStr <= hoverDate;

            let bgClass = "hover:bg-blue-50 text-gray-700";
            if (isPast) bgClass = "text-gray-300 cursor-not-allowed";
            else if (isSelected) bgClass = "bg-[#0A1A44] text-white shadow-md";
            else if (isInRange) bgClass = "bg-blue-100 text-[#0A1A44]";
            else if (isHoverRange)
              bgClass =
                "bg-blue-50 text-[#0A1A44] border border-blue-200 dashed";

            return (
              <button
                key={day}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                className={`h-8 w-8 text-xs rounded-full flex items-center justify-center transition-all ${bgClass}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    if (!roomId || !checkIn || !checkOut || !totalAmount) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_type_id: roomId,
          check_in_date: checkIn,
          check_out_date: checkOut,
          adults,
          children,
          infants,
          guests_count: adults + children,
          total_amount: totalAmount,
          special_requests: notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to create booking");

      toast.success("Booking created!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Error creating booking");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0A1A44] p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-serif font-bold text-xl">New Booking</h2>
            <p className="text-xs text-blue-200">
              Manually reserve a room for a guest
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* 1. Room Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Select Room
            </label>
            <div className="relative">
              <select
                className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-[#0A1A44]"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                <option value="">-- Choose a Room --</option>
                {roomTypes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — ₱{r.base_price.toLocaleString()} / night
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Calendar Date Picker */}
          <div className="relative" ref={calendarRef}>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Dates of Stay
            </label>
            <div
              onClick={() => setShowCalendar(!showCalendar)}
              className={`w-full p-3 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer bg-white hover:border-[#0A1A44] transition-all ${showCalendar ? "ring-2 ring-[#0A1A44] border-transparent" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-[#0A1A44]">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Check In — Check Out
                  </span>
                  <span
                    className={`text-sm font-bold ${checkIn ? "text-slate-800" : "text-slate-400"}`}
                  >
                    {checkIn
                      ? new Date(checkIn).toLocaleDateString()
                      : "Select Date"}
                    {" — "}
                    {checkOut
                      ? new Date(checkOut).toLocaleDateString()
                      : "Select Date"}
                  </span>
                </div>
              </div>
            </div>

            {/* Calendar Popover */}
            {showCalendar && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col md:flex-row gap-4 animate-in zoom-in-95 origin-top">
                <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                  <button
                    type="button"
                    onClick={() =>
                      setViewDate(
                        new Date(viewDate.setMonth(viewDate.getMonth() - 1)),
                      )
                    }
                    className="pointer-events-auto p-1 hover:bg-slate-100 rounded-full text-slate-600"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setViewDate(
                        new Date(viewDate.setMonth(viewDate.getMonth() + 1)),
                      )
                    }
                    className="pointer-events-auto p-1 hover:bg-slate-100 rounded-full text-slate-600"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center w-full">
                  {renderMonth(0)}
                </div>
              </div>
            )}
          </div>

          {/* 3. Guest Counters */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Guest Breakdown
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Adults */}
              <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Adults
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-[#0A1A44]">
                    {adults}
                  </span>
                  <button
                    onClick={() => setAdults(adults + 1)}
                    className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                  <Baby className="w-3 h-3" /> Kids
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-[#0A1A44]">
                    {children}
                  </span>
                  <button
                    onClick={() => setChildren(children + 1)}
                    className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Infants */}
              <div className="flex flex-col items-center p-2 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                  <Milk className="w-3 h-3" /> Infants
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInfants(Math.max(0, infants - 1))}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center hover:bg-blue-100 text-blue-600 shadow-sm"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-blue-700">
                    {infants}
                  </span>
                  <button
                    onClick={() => setInfants(infants + 1)}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center hover:bg-blue-100 text-blue-600 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Total Amount (Read-Only) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Total Estimate
              </p>
              <p className="text-[10px] text-slate-400">
                Based on room rate & nights
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-serif font-bold text-[#0A1A44]">
                ₱{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 5. Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Special Requests / Notes
            </label>
            <textarea
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#0A1A44] outline-none"
              rows={2}
              placeholder="e.g. Early check-in requested, VIP guest..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-6 text-base bg-[#0A1A44] hover:bg-blue-900 text-white shadow-lg shadow-blue-900/20 rounded-xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Confirm Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
