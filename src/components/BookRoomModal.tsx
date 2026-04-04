"use client";

import { AuthButton } from "@/components/auth/AuthButton";
import UserPaymentModal from "@/components/UserPaymentModal";
import { createClient } from "@/lib/supabase/client";
import {
  Baby,
  BedDouble,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Milk,
  Minus,
  Moon,
  Plus,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  initialAdults?: number;
  initialChildren?: number;
  initialInfants?: number;
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
  initialAdults = 1,
  initialChildren = 0,
  initialInfants = 0,
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

  // ✅ Individual Counters
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [infants, setInfants] = useState(initialInfants);

  const [error, setError] = useState<string | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<{
    id: string;
    total_amount: number;
  } | null>(null);

  // Calendar UI State
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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
      setViewDate(start);
    }
  }, [initialCheckIn, initialCheckOut, room.price_day, room.price_night]);

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
  let totalPrice = 0;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (stayType === "day") {
      totalPrice = room.price_day || room.base_price;
    } else if (stayType === "night") {
      totalPrice = room.price_night || room.base_price;
    } else {
      if (diffDays > 0) {
        totalPrice = diffDays * (room.price_overnight || room.base_price);
      }
    }
  }

  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    if (type !== "overnight" && checkIn) {
      setCheckOut(checkIn);
    }
  };

  const handleDateClick = (dateStr: string) => {
    if (stayType !== "overnight") {
      setCheckIn(dateStr);
      setCheckOut(dateStr);
      setShowCalendar(false);
      return;
    }

    if (!checkIn || (checkIn && checkOut && checkIn !== checkOut)) {
      setCheckIn(dateStr);
      setCheckOut("");
    } else if (checkIn && !checkOut) {
      if (dateStr < checkIn) {
        setCheckIn(dateStr);
      } else if (dateStr === checkIn) {
        toast.error("Overnight stays require at least 1 night.");
      } else {
        setCheckOut(dateStr);
        setShowCalendar(false);
      }
    } else if (checkIn && checkOut && checkIn === checkOut) {
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
      params.set("adults", adults.toString());
      params.set("children", children.toString());
      params.set("infants", infants.toString());
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
          adults: adults,
          children: children,
          infants: infants,
          guests: adults + children,
          total_price: totalPrice,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to complete booking.");

      setCreatedBooking({
        id: result.booking.id,
        total_amount: result.booking.total_amount,
      });
      setShowPaymentModal(true);
      toast.success("Booking created! Please complete payment.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
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

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    onClose();
    router.push("/dashboard");
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl overflow-visible">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#0A1A44] mb-1">
                  Book {room.name}
                </h2>
                <p className="text-slate-500 text-sm">
                  Select your dates and experience.
                </p>
              </div>

              {/* EXPERIENCE TOGGLES */}
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

              {/* DATE PICKER */}
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

                {/* CALENDAR POPOVER */}
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col md:flex-row gap-4 animate-in zoom-in-95 origin-top-left w-75 md:w-137.5">
                    <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                      <button
                        type="button"
                        onClick={() =>
                          setViewDate(
                            new Date(
                              viewDate.setMonth(viewDate.getMonth() - 1),
                            ),
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
                            new Date(
                              viewDate.setMonth(viewDate.getMonth() + 1),
                            ),
                          )
                        }
                        className="pointer-events-auto p-1 hover:bg-slate-100 rounded-full text-slate-600"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                      {renderMonth(0)}
                      <div className="hidden md:block w-px bg-slate-100"></div>
                      <div className="hidden md:block">{renderMonth(1)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* AGE-SPECIFIC GUEST SELECTORS */}
              <div className="grid grid-cols-3 gap-2">
                {/* Adults Input */}
                <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Adults
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={adults}
                      onChange={(e) =>
                        setAdults(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-8 text-center outline-none font-bold text-[#0A1A44] no-spinner bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setAdults(adults + 1)}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">
                    13+ Yrs
                  </span>
                </div>

                {/* Children Input */}
                <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                    <Baby className="w-3 h-3" /> Children
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) =>
                        setChildren(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-8 text-center outline-none font-bold text-[#0A1A44] no-spinner bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setChildren(children + 1)}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">
                    3-12 Yrs
                  </span>
                </div>

                {/* Infants Input (Free) */}
                <div className="flex flex-col items-center p-2 rounded-xl border border-blue-100 bg-blue-50/50">
                  <span className="text-[10px] font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                    <Milk className="w-3 h-3" /> Infants
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInfants(Math.max(0, infants - 1))}
                      className="w-6 h-6 bg-white hover:bg-blue-100 rounded-full flex items-center justify-center text-blue-600 transition-colors shadow-sm"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={infants}
                      onChange={(e) =>
                        setInfants(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-8 text-center outline-none font-bold text-blue-800 no-spinner bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setInfants(infants + 1)}
                      className="w-6 h-6 bg-white hover:bg-blue-100 rounded-full flex items-center justify-center text-blue-600 transition-colors shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[9px] font-bold text-blue-600 mt-1 uppercase">
                    Free (0-2)
                  </span>
                </div>
              </div>

              {/* PRICE SUMMARY */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center mt-2">
                {/* Total Online Payment Row */}
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs text-slate-500 font-medium">
                    Total Online Payment
                  </span>
                  <span className="text-2xl font-bold text-[#0A1A44]">
                    ₱ {totalPrice.toLocaleString()}
                  </span>
                </div>

                {/* Security Deposit Row */}
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-600 font-semibold">
                      Refundable Security Deposit
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      One Thousand Pesos (₱1,000.00) — Cash, collected at
                      check-in
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 ml-4 shrink-0">
                    + ₱1,000
                  </span>
                </div>

                {/* Asterisk Footnote */}
                <p className="text-[9px] text-slate-400 leading-tight mt-2 flex items-start gap-1">
                  <span className="text-red-400 font-bold">*</span>
                  The security deposit is fully refundable upon check-out,
                  subject to room inspection.
                </p>
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
                  {loading ? "Checking..." : "Confirm Booking"}
                </AuthButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && createdBooking && (
        <UserPaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          booking={createdBooking}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
