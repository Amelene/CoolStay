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
  Tag,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface BookingData {
  id: string;
  name: string;
  base_price: number;
  price_day?: number;
  price_night?: number;
  price_overnight?: number;
  capacity?: number;
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

  const [stayType, setStayType] = useState<StayType>(() => {
    if (room.price_overnight || room.base_price) return "overnight";
    if (room.price_day) return "day";
    return "night";
  });

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [infants, setInfants] = useState(initialInfants);
  const [seniors, setSeniors] = useState(0);
  const [pwds, setPwds] = useState(0);

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [verifyingPromo, setVerifyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: string;
    value: number;
    id: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<{
    id: string;
    total_amount: number;
  } | null>(null);

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
      )
        setShowCalendar(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const maxCapacity = room.capacity || 10;
  const currentTotalGuests = adults + children + seniors + pwds;
  const canAddGuest = currentTotalGuests < maxCapacity;

  const handleAddGuest = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    currentValue: number,
  ) => {
    if (canAddGuest) setter(currentValue + 1);
    else
      toast.error(
        `Maximum capacity of ${maxCapacity} guests reached for ${room.name}.`,
      );
  };

  // 🔒 NEW: Smart Input Typing Handlers
  const handleTypeGuest = (
    valStr: string,
    setter: React.Dispatch<React.SetStateAction<number>>,
    currentVal: number,
  ) => {
    if (valStr === "") {
      setter(0); // Allow temporary empty state for clean backspacing
      return;
    }
    const val = parseInt(valStr, 10);
    if (isNaN(val) || val < 0) return;

    const otherGuests = currentTotalGuests - currentVal;
    if (otherGuests + val > maxCapacity) {
      toast.error(
        `Maximum capacity of ${maxCapacity} guests reached for ${room.name}.`,
      );
      setter(maxCapacity - otherGuests);
    } else {
      setter(val);
    }
  };

  const handleTypeInfant = (valStr: string) => {
    if (valStr === "") {
      setInfants(0);
      return;
    }
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 0) setInfants(val);
  };

  let baseTotalPrice = 0;
  let finalTotalPrice = 0;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (stayType === "day") baseTotalPrice = room.price_day || room.base_price;
    else if (stayType === "night")
      baseTotalPrice = room.price_night || room.base_price;
    else if (diffDays > 0)
      baseTotalPrice = diffDays * (room.price_overnight || room.base_price);
  }

  let seniorPwdDiscount = 0;
  const totalHeadcount = adults + children + seniors + pwds;
  if (totalHeadcount > 0 && (seniors > 0 || pwds > 0)) {
    const perPaxRate = baseTotalPrice / totalHeadcount;
    const eligibleShare = perPaxRate * (seniors + pwds);
    seniorPwdDiscount = eligibleShare * 0.2;
  }

  let marketingDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === "percentage")
      marketingDiscount = baseTotalPrice * (appliedPromo.value / 100);
    else marketingDiscount = appliedPromo.value;
  }

  let finalDiscountAmount = 0;
  let activeDiscountType: "none" | "senior" | "promo" = "none";

  if (seniorPwdDiscount > 0 || marketingDiscount > 0) {
    if (seniorPwdDiscount >= marketingDiscount) {
      finalDiscountAmount = seniorPwdDiscount;
      activeDiscountType = "senior";
    } else {
      finalDiscountAmount = marketingDiscount;
      activeDiscountType = "promo";
    }
  }

  finalTotalPrice = baseTotalPrice - finalDiscountAmount;

  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    if (type !== "overnight" && checkIn) setCheckOut(checkIn);
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
      if (dateStr < checkIn) setCheckIn(dateStr);
      else if (dateStr === checkIn)
        toast.error("Overnight stays require at least 1 night.");
      else {
        setCheckOut(dateStr);
        setShowCalendar(false);
      }
    } else if (checkIn && checkOut && checkIn === checkOut) {
      setCheckIn(dateStr);
      setCheckOut("");
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    if (baseTotalPrice <= 0) {
      toast.error("Please select your dates first to apply a promo.");
      return;
    }

    setVerifyingPromo(true);
    try {
      const res = await fetch("/api/promotions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput,
          cart_total: baseTotalPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to verify promo code.");

      setAppliedPromo(data.promo);
      toast.success("Promo code applied successfully!");
      setPromoCodeInput("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setAppliedPromo(null);
    } finally {
      setVerifyingPromo(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const nowPHT = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    );
    const todayPHTStr = `${nowPHT.getFullYear()}-${String(nowPHT.getMonth() + 1).padStart(2, "0")}-${String(nowPHT.getDate()).padStart(2, "0")}`;

    if (!checkIn) {
      toast.error("Please select a date.");
      setLoading(false);
      return;
    }
    if (checkIn < todayPHTStr) {
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
      router.push(`/login?return_to=${encodeURIComponent(`/accommodation`)}`);
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
          adults,
          children,
          infants,
          seniors,
          pwds,
          booking_type: stayType,
          promo_code:
            activeDiscountType === "promo" && appliedPromo
              ? appliedPromo.code
              : null,
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

    const nowPHT = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    );
    const todayPHTStr = `${nowPHT.getFullYear()}-${String(nowPHT.getMonth() + 1).padStart(2, "0")}-${String(nowPHT.getDate()).padStart(2, "0")}`;
    const currentHourPHT = nowPHT.getHours();

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

            let isPast = dateStr < todayPHTStr;

            if (dateStr === todayPHTStr) {
              if (stayType === "day" && currentHourPHT >= 14) isPast = true;
              if (stayType === "night" && currentHourPHT >= 21) isPast = true;
              if (stayType === "overnight" && currentHourPHT >= 18)
                isPast = true;
            }

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
                title={
                  isPast && dateStr === todayPHTStr
                    ? "Booking closed for today"
                    : undefined
                }
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar">
          <div className="p-8">
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
                      <span
                        className={`text-sm font-bold ${checkIn ? "text-slate-900" : "text-slate-400"}`}
                      >
                        {checkIn
                          ? new Date(checkIn).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Check-in"}{" "}
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {/* Adults */}
                  <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Adults
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={adults === 0 ? "" : adults}
                        onChange={(e) =>
                          handleTypeGuest(e.target.value, setAdults, adults)
                        }
                        onBlur={() => {
                          if (adults < 1) setAdults(1);
                        }}
                        placeholder="1"
                        className="text-center outline-none font-bold text-[#0A1A44] no-spinner bg-transparent min-w-[2rem]"
                        style={{ width: `${String(adults).length + 1}ch` }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGuest(setAdults, adults)}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      13+ Yrs
                    </span>
                  </div>

                  {/* Children */}
                  <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                      <Baby className="w-3 h-3" /> Children
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={children === 0 ? "" : children}
                        onChange={(e) =>
                          handleTypeGuest(e.target.value, setChildren, children)
                        }
                        placeholder="0"
                        className="text-center outline-none font-bold text-[#0A1A44] no-spinner bg-transparent min-w-[2rem]"
                        style={{ width: `${String(children).length + 1}ch` }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGuest(setChildren, children)}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      3-12 Yrs
                    </span>
                  </div>

                  {/* Infants */}
                  <div className="flex flex-col items-center p-2 rounded-xl border border-blue-100 bg-blue-50/50">
                    <span className="text-[10px] font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                      <Milk className="w-3 h-3" /> Infants
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                        className="w-6 h-6 bg-white hover:bg-blue-100 rounded-full flex items-center justify-center text-blue-600 transition-colors shadow-sm shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={infants === 0 ? "" : infants}
                        onChange={(e) => handleTypeInfant(e.target.value)}
                        placeholder="0"
                        className="text-center outline-none font-bold text-blue-800 no-spinner bg-transparent min-w-[2rem]"
                        style={{ width: `${String(infants).length + 1}ch` }}
                      />
                      <button
                        type="button"
                        onClick={() => setInfants(infants + 1)}
                        className="w-6 h-6 bg-white hover:bg-blue-100 rounded-full flex items-center justify-center text-blue-600 transition-colors shadow-sm shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[9px] font-bold text-blue-600 mt-1 uppercase">
                      Free (0-2)
                    </span>
                  </div>

                  {/* Seniors */}
                  <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Seniors
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSeniors(Math.max(0, seniors - 1))}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={seniors === 0 ? "" : seniors}
                        onChange={(e) =>
                          handleTypeGuest(e.target.value, setSeniors, seniors)
                        }
                        placeholder="0"
                        className="text-center outline-none font-bold text-[#0A1A44] no-spinner bg-transparent min-w-[2rem]"
                        style={{ width: `${String(seniors).length + 1}ch` }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGuest(setSeniors, seniors)}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      20% Off
                    </span>
                  </div>

                  {/* PWDs */}
                  <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#0A1A44] uppercase mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> PWDs
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPwds(Math.max(0, pwds - 1))}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={pwds === 0 ? "" : pwds}
                        onChange={(e) =>
                          handleTypeGuest(e.target.value, setPwds, pwds)
                        }
                        placeholder="0"
                        className="text-center outline-none font-bold text-[#0A1A44] no-spinner bg-transparent min-w-[2rem]"
                        style={{ width: `${String(pwds).length + 1}ch` }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGuest(setPwds, pwds)}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">
                      20% Off
                    </span>
                  </div>
                </div>

                {(seniors > 0 || pwds > 0) && (
                  <div
                    className={`p-4 rounded-xl border transition-all ${activeDiscountType === "promo" ? "bg-slate-50 border-slate-200" : "bg-red-50 border-red-200"}`}
                  >
                    <h4
                      className={`text-xs font-bold uppercase mb-2 flex items-center gap-1.5 ${activeDiscountType === "promo" ? "text-slate-500" : "text-red-800"}`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Mandatory ID Presentation
                    </h4>

                    {activeDiscountType === "promo" ? (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        <span className="font-bold text-slate-700 mr-1">
                          Note:
                        </span>
                        Your Promo Code gives higher savings than the Senior/PWD
                        discount. You do not need to present IDs at check-in.
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-700 leading-relaxed">
                        You have applied a Senior Citizen / PWD discount. You{" "}
                        <strong className="font-black text-red-900 uppercase">
                          must
                        </strong>{" "}
                        present valid physical IDs at the front desk upon
                        check-in. Failure to present valid IDs will result in
                        the immediate forfeiture of this discount, and the
                        balance will be charged to you on-site.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-[#0A1A44] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Promo Code
                  </label>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-green-700 bg-white px-2 py-1 rounded shadow-sm border border-green-100">
                          {appliedPromo.code}
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          Applied!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-xs text-slate-400 hover:text-red-500 underline font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. SUMMER2026"
                        value={promoCodeInput}
                        onChange={(e) =>
                          setPromoCodeInput(e.target.value.toUpperCase())
                        }
                        className="flex-1 text-sm border border-slate-200 p-2 rounded-lg outline-none focus:border-[#0A1A44] uppercase font-bold text-slate-700 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={verifyingPromo || !promoCodeInput}
                        className="bg-[#0A1A44] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#0A1A44]/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center"
                      >
                        {verifyingPromo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center mt-2 relative overflow-hidden">
                  {activeDiscountType === "promo" && seniorPwdDiscount > 0 && (
                    <div className="absolute top-0 left-0 right-0 bg-blue-100 text-blue-800 text-[9px] font-bold uppercase text-center py-0.5 tracking-wider">
                      Promo gives higher savings than Senior discount
                    </div>
                  )}
                  {activeDiscountType === "senior" && appliedPromo && (
                    <div className="absolute top-0 left-0 right-0 bg-red-100 text-red-800 text-[9px] font-bold uppercase text-center py-0.5 tracking-wider">
                      Senior discount applied (Higher savings than promo)
                    </div>
                  )}

                  <div
                    className={`flex justify-between items-center mb-1 ${seniorPwdDiscount > 0 || marketingDiscount > 0 ? "mt-3" : ""}`}
                  >
                    <span className="text-xs text-slate-400">Base Price</span>
                    <span
                      className={`text-sm ${finalDiscountAmount > 0 ? "text-slate-400 line-through" : "font-medium text-slate-700"}`}
                    >
                      ₱ {baseTotalPrice.toLocaleString()}
                    </span>
                  </div>

                  {finalDiscountAmount > 0 && (
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200/50">
                      <span className="text-xs text-green-600 font-semibold flex flex-col">
                        {activeDiscountType === "senior"
                          ? "Senior/PWD Discount (20%)"
                          : `Promo (${appliedPromo?.code})`}
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        - ₱{" "}
                        {finalDiscountAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs text-slate-500 font-medium">
                      Total Online Payment
                    </span>
                    <span className="text-2xl font-bold text-[#0A1A44]">
                      ₱ {finalTotalPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-600 font-semibold">
                        Refundable Security Deposit
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        ₱1,000.00 — Cash, collected at check-in
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 ml-4 shrink-0">
                      + ₱1,000
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight mt-2 flex items-start gap-1">
                    <span className="text-red-400 font-bold">*</span>Fully
                    refundable upon check-out, subject to inspection.
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
                    disabled={loading || finalTotalPrice <= 0}
                    onClick={handleBooking}
                  >
                    {loading ? "Checking..." : "Confirm Booking"}
                  </AuthButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && createdBooking && (
        <UserPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          booking={createdBooking}
          onSuccess={() => {
            setShowPaymentModal(false);
            onClose();
            router.push("/dashboard");
          }}
        />
      )}
    </>
  );
}
