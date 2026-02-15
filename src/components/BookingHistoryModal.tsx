"use client";

import { useState, useMemo } from "react";
import { X, CalendarDays, Filter } from "lucide-react";
import BookingCard, { Booking } from "@/components/BookingCard";
import { User } from "@supabase/supabase-js";

// --- FILTER TYPES ---
type TimeStatus = "all" | "upcoming" | "completed" | "cancelled";
type PaymentStatus = "all" | "unpaid" | "partial" | "paid";

interface BookingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  onCancelClick: (id: string) => void;
  onReview: (booking: Booking) => void;
  onPay: (booking: Booking) => void;
  reviewedBookingIds: Set<string>;
  user: User | null;
}

export default function BookingHistoryModal({
  isOpen,
  onClose,
  bookings,
  onCancelClick,
  onReview,
  onPay,
  reviewedBookingIds,
  user,
}: BookingHistoryModalProps) {
  const [timeFilter, setTimeFilter] = useState<TimeStatus>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus>("all");

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort(
      (a, b) =>
        new Date(b.check_in_date).getTime() -
        new Date(a.check_in_date).getTime(),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sorted.filter((b) => {
      const checkOut = new Date(b.check_out_date);
      const status = b.status.toLowerCase();

      // Time Filter
      let matchesTime = true;
      if (timeFilter === "cancelled") matchesTime = status === "cancelled";
      else if (timeFilter === "completed")
        matchesTime = checkOut < today && status !== "cancelled";
      else if (timeFilter === "upcoming")
        matchesTime = checkOut >= today && status !== "cancelled";

      // Payment Filter
      let matchesPayment = true;
      const validPayments =
        b.payments?.filter(
          (p) => p.status === "completed" || p.status === "paid",
        ) || [];
      const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, b.total_amount - totalPaid);

      if (paymentFilter === "unpaid") matchesPayment = totalPaid === 0;
      else if (paymentFilter === "partial")
        matchesPayment = totalPaid > 0 && balance > 0;
      else if (paymentFilter === "paid") matchesPayment = balance <= 0;

      return matchesTime && matchesPayment;
    });
  }, [bookings, timeFilter, paymentFilter]);

  if (!isOpen) return null;

  const timeOptions: { id: TimeStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Past" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const paymentOptions: { id: PaymentStatus; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unpaid", label: "Unpaid" },
    { id: "partial", label: "Partial" },
    { id: "paid", label: "Paid" },
  ];

  const clearFilters = () => {
    setTimeFilter("all");
    setPaymentFilter("all");
  };

  const hasActiveFilters = timeFilter !== "all" || paymentFilter !== "all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#F8FAFC] rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 border border-slate-200">
        {/* COMPACT HEADER */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center text-[#0A1A44]">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0A1A44] leading-none">
                Your Trips
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                History & Upcoming
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPACT FILTER BAR */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="flex gap-4">
              {/* Status Group */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Time
                </span>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {timeOptions.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTimeFilter(f.id)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        timeFilter === f.id
                          ? "bg-white text-[#0A1A44] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-slate-200 h-6 hidden sm:block"></div>

              {/* Payment Group */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Payment
                </span>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {paymentOptions.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setPaymentFilter(f.id)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        paymentFilter === f.id
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1 self-end sm:self-auto"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* LIST CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
          {filteredBookings.length > 0 ? (
            <div className="space-y-3 max-w-2xl mx-auto">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancelClick={onCancelClick}
                  onReview={onReview}
                  onPay={onPay}
                  hasReviewed={reviewedBookingIds.has(booking.id)}
                  user={user}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Filter className="w-8 h-8 opacity-20" />
              <p className="text-sm font-medium text-slate-500">
                No trips match these filters.
              </p>
              <button
                onClick={clearFilters}
                className="text-xs text-blue-500 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* COMPACT FOOTER */}
        <div className="px-6 py-2 bg-white border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium shrink-0">
          <span>{bookings.length} Total Bookings</span>
          <span>Showing {filteredBookings.length} results</span>
        </div>
      </div>
    </div>
  );
}
