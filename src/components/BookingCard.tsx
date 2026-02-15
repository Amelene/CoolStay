"use client";

import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import {
  Download,
  Loader2,
  CalendarDays,
  Users,
  Baby,
  Milk,
  Hash,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BookingReceipt from "@/components/pdf/BookingReceipt";

// --- EXPORTED TYPES ---
export interface RoomType {
  id: string;
  name: string;
  image_url: string;
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  description?: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  guests_count: number;
  adults: number;
  children: number;
  infants: number;
  room_types: RoomType | null;
  payments?: Payment[];
}

interface BookingCardProps {
  booking: Booking;
  onCancelClick: (id: string) => void;
  onReview: (booking: Booking) => void;
  onPay: (booking: Booking) => void;
  hasReviewed: boolean;
  user: User | null;
}

export default function BookingCard({
  booking,
  onCancelClick,
  onReview,
  onPay,
  hasReviewed,
  user,
}: BookingCardProps) {
  const room = booking.room_types;
  const checkIn = new Date(booking.check_in_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const checkOut = new Date(booking.check_out_date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );

  // Calculate Nights
  const start = new Date(booking.check_in_date);
  const end = new Date(booking.check_out_date);
  const nights = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";
  const canReview =
    (booking.status === "checked_out" || booking.status === "completed") &&
    !hasReviewed;

  // Financial Calculations
  const validPayments =
    booking.payments?.filter(
      (p) => p.status === "completed" || p.status === "paid",
    ) || [];
  const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, booking.total_amount - totalPaid);
  const isFullyPaid = balance <= 0;
  const hasPendingPayment = booking.payments?.some(
    (p) => p.status === "pending",
  );

  const showPayNow =
    (booking.status === "pending" || booking.status === "confirmed") &&
    !isFullyPaid &&
    !hasPendingPayment;

  const receiptData = {
    ...booking,
    users: {
      full_name: user?.user_metadata?.full_name || "Guest",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  };

  // Status Styling
  const statusStyles = {
    confirmed: "bg-green-50 text-green-700 border-green-200 ring-green-100",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-100",
    cancelled: "bg-red-50 text-red-700 border-red-200 ring-red-100",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-100",
    checked_out: "bg-slate-50 text-slate-700 border-slate-200 ring-slate-100",
    completed: "bg-slate-50 text-slate-700 border-slate-200 ring-slate-100",
  };
  const currentStatusStyle =
    statusStyles[booking.status as keyof typeof statusStyles] ||
    statusStyles.pending;

  return (
    <div className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
      {/* Decorative Left Border */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
          booking.status === "confirmed"
            ? "bg-green-500"
            : booking.status === "pending"
              ? "bg-yellow-400"
              : booking.status === "cancelled"
                ? "bg-red-400"
                : "bg-slate-300"
        }`}
      />

      <div className="flex flex-col sm:flex-row gap-4 pl-3">
        {/* COMPACT IMAGE SECTION */}
        <div className="w-full sm:w-28 h-28 relative rounded-xl overflow-hidden shrink-0 bg-slate-100">
          <Image
            src={room?.image_url || "/images/background/coolstaybg.png"}
            alt={room?.name || "Room"}
            fill
            className="object-cover"
          />
          {/* Status Badge Overlaid on Mobile, Hidden on Desktop */}
          <div className="absolute top-2 left-2 sm:hidden">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${currentStatusStyle}`}
            >
              {booking.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Header: Name + Status (Desktop) */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="text-[#0A1A44] font-bold font-serif text-lg leading-tight truncate">
                  {room?.name || "Standard Room"}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 font-mono">
                  <Hash className="w-3 h-3" />
                  <span>#{booking.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              {/* Desktop Status Badge */}
              <span
                className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${currentStatusStyle}`}
              >
                {booking.status.replace("_", " ")}
              </span>
            </div>

            {/* COMPACT INFO ROW */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">
                  {checkIn} - {checkOut}
                </span>
                <span className="text-slate-400 px-1">•</span>
                <span className="text-slate-500">{nights} Nights</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{booking.adults}</span>
                </div>
                {booking.children > 0 && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <Baby className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{booking.children}</span>
                  </div>
                )}
                {booking.infants > 0 && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <Milk className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{booking.infants}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COMPACT FOOTER */}
          <div className="flex flex-wrap items-end justify-between gap-3 mt-3 pt-3 border-t border-slate-100 dashed">
            {/* Financials - Tight Horizontal Layout */}
            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Total
                </span>
                <span className="font-black text-[#0A1A44]">
                  ₱{booking.total_amount?.toLocaleString()}
                </span>
              </div>

              {(totalPaid > 0 || !isFullyPaid) && (
                <div className="h-6 w-px bg-slate-200"></div>
              )}

              {totalPaid > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Paid
                  </span>
                  <span className="font-bold text-green-600">
                    ₱{totalPaid.toLocaleString()}
                  </span>
                </div>
              )}

              {!isFullyPaid && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Due
                  </span>
                  <span className="font-bold text-red-500">
                    ₱{balance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions - Smaller Buttons */}
            <div className="flex gap-2 ml-auto">
              {showPayNow && (
                <Button
                  size="sm"
                  onClick={() => onPay(booking)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7 px-3 rounded-lg shadow-sm"
                >
                  Pay Now
                </Button>
              )}

              {hasPendingPayment && (
                <div className="flex items-center gap-1 px-2 h-7 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-[10px] font-bold uppercase">
                    Verifying
                  </span>
                </div>
              )}

              {totalPaid > 0 && (
                <PDFDownloadLink
                  document={
                    <BookingReceipt
                      booking={receiptData}
                      payments={validPayments}
                    />
                  }
                  fileName={`Receipt_${booking.id.substring(0, 8)}.pdf`}
                  className="flex items-center justify-center h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Download Receipt"
                >
                  {({ loading }) =>
                    loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )
                  }
                </PDFDownloadLink>
              )}

              {canReview && (
                <Button
                  size="sm"
                  onClick={() => onReview(booking)}
                  className="bg-[#0A1A44] text-[10px] h-7 px-3 rounded-lg"
                >
                  Rate
                </Button>
              )}

              {canCancel && (
                <button
                  onClick={() => onCancelClick(booking.id)}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-semibold px-2 hover:bg-red-50 rounded-lg transition-colors h-7"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
