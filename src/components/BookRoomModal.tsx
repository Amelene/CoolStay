"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthButton } from "@/components/auth/AuthButton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  BedDouble,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

// --- TYPES ---
export interface BookingData {
  id: string;
  name: string;
  base_price: number;
  price_day?: number;
  price_night?: number;
  price_overnight?: number;
}

interface BookRoomModalProps {
  room: BookingData;
  onClose: () => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

type StayType = "day" | "night" | "overnight";

// --- HELPER: Calendar Logic ---
const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

export default function BookRoomModal({
  room,
  onClose,
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 2,
}: BookRoomModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // --- STATE ---
  const [stayType, setStayType] = useState<StayType>(() => {
    if (room.price_overnight || room.base_price) return "overnight";
    if (room.price_day) return "day";
    return "night";
  });

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [error, setError] = useState<string | null>(null);

  // Calendar UI State
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); // Controls which months are shown
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // --- INIT LOGIC (Run Once) ---
  useEffect(() => {
    if (initialCheckIn && initialCheckOut) {
      const start = new Date(initialCheckIn);
      const end = new Date(initialCheckOut);
      if (start.getTime() === end.getTime()) {
        if (room.price_day) setStayType("day");
        else if (room.price_night) setStayType("night");
      } else {
        setStayType("overnight");
      }
      setViewDate(start); // Jump calendar to selected date
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close calendar if clicking outside
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

  // --- PRICE CALCULATION ---
  let nights = 0;
  let totalPrice = 0;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (stayType === "day") {
      nights = 1;
      totalPrice = room.price_day || room.base_price;
    } else if (stayType === "night") {
      nights = 1;
      totalPrice = room.price_night || room.base_price;
    } else {
      if (diffDays > 0) {
        nights = diffDays;
        totalPrice = diffDays * (room.price_overnight || room.base_price);
      }
    }
  }

  // --- HANDLERS ---
  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    if (type !== "overnight" && checkIn) {
      setCheckOut(checkIn); // Auto-lock single day
    }
  };

  // Calendar Date Selection Logic
  const handleDateClick = (dateStr: string) => {
    // 1. Day/Night Tour (Single Click)
    if (stayType !== "overnight") {
      setCheckIn(dateStr);
      setCheckOut(dateStr);
      setShowCalendar(false); // Done selection
      return;
    }

    // 2. Overnight (Range Logic)
    if (!checkIn || (checkIn && checkOut && checkIn !== checkOut)) {
      // Start new selection
      setCheckIn(dateStr);
      setCheckOut("");
    } else if (checkIn && !checkOut) {
      // Completing the range
      if (dateStr < checkIn) {
        // User clicked before start date -> Reset start
        setCheckIn(dateStr);
      } else if (dateStr === checkIn) {
        // Clicked same date in overnight mode -> Invalid (needs 1 night)
        toast.error("Overnight stays require at least 1 night.");
      } else {
        // Valid range
        setCheckOut(dateStr);
        setShowCalendar(false);
      }
    } else if (checkIn && checkOut && checkIn === checkOut) {
      // Resetting from a single-day state
      setCheckIn(dateStr);
      setCheckOut("");
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    if (!checkIn) {
      toast.error("Please select a date.");
      setLoading(false);
      return;
    }

    if (checkIn < today) {
      toast.error("Cannot book past dates.");
      setLoading(false);
      return;
    }

    if (stayType === "overnight" && checkOut <= checkIn) {
      toast.error("Overnight stays require check-out after check-in.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.info("Please log in to complete your booking.");
      const params = new URLSearchParams();
      params.set("room_id", room.id);
      params.set("check_in", checkIn);
      params.set("check_out", checkOut);
      params.set("guests", guests.toString());
      router.push(
        `/login?return_to=${encodeURIComponent(`/accommodation?${params.toString()}`)}`,
      );
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_type_id: room.id,
          check_in: checkIn,
          check_out: checkOut,
          guests: guests,
          total_price: totalPrice,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to complete booking.");

      toast.success("Booking Request Sent!");
      onClose();
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- CALENDAR RENDERER ---
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

            // Selection Logic
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
            else if (isHoverRange && stayType === "overnight")
              bgClass =
                "bg-blue-50 text-[#0A1A44] border border-blue-200 dashed";

            return (
              <button
                key={day}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                className={`
                  h-8 w-8 text-xs rounded-full flex items-center justify-center transition-all
                  ${bgClass}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl overflow-visible">
        {" "}
        {/* overflow-visible for calendar popover */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col md:flex-row gap-8">
          {/* LEFT SIDE: FORM */}
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#0A1A44] mb-1">
                Book {room.name}
              </h2>
              <p className="text-slate-500 text-sm">
                Select your dates and experience.
              </p>
            </div>

            {/* EXPERIENCE SELECTOR */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStayTypeChange("day")}
                disabled={!room.price_day}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${stayType === "day" ? "bg-[#0A1A44] text-white border-[#0A1A44] shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"}`}
              >
                <Sun className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase">
                  Day Tour
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleStayTypeChange("night")}
                disabled={!room.price_night}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${stayType === "night" ? "bg-[#0A1A44] text-white border-[#0A1A44] shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"}`}
              >
                <Moon className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase">
                  Night Tour
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleStayTypeChange("overnight")}
                disabled={!room.price_overnight && !room.base_price}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${stayType === "overnight" ? "bg-[#0A1A44] text-white border-[#0A1A44] shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"}`}
              >
                <BedDouble className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold uppercase">
                  Overnight
                </span>
              </button>
            </div>

            {/* DATE PICKER TRIGGER */}
            <div className="relative" ref={calendarRef}>
              <label className="text-xs font-bold text-[#0A1A44] uppercase tracking-wider mb-1 block">
                Date of Stay
              </label>
              <div
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl flex items-center justify-between cursor-pointer hover:border-[#0A1A44] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-slate-400 group-hover:text-[#0A1A44]" />
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-bold ${checkIn ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {checkIn
                        ? new Date(checkIn).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Check-in"}
                      {" — "}
                      {checkOut
                        ? new Date(checkOut).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Check-out"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AGODA-STYLE CALENDAR POPOVER */}
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col md:flex-row gap-4 animate-in zoom-in-95 origin-top-left w-[300px] md:w-[550px]">
                  {/* Calendar Controls */}
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

                  {/* Dual Month Grid */}
                  <div className="flex gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {renderMonth(0)}
                    <div className="hidden md:block w-px bg-slate-100"></div>
                    <div className="hidden md:block">{renderMonth(1)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* GUESTS & SUMMARY */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#0A1A44] uppercase tracking-wider mb-1 block">
                  Guests
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value))}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0A1A44] outline-none text-slate-900 font-medium"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-center">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-500 font-medium">
                    Total
                  </span>
                  <span className="text-lg font-bold text-[#0A1A44]">
                    ₱ {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="pt-2">
              <AuthButton
                type="submit"
                disabled={loading || totalPrice <= 0}
                onClick={handleBooking}
              >
                {loading
                  ? "Checking..."
                  : `Book for ₱${totalPrice.toLocaleString()}`}
              </AuthButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
