"use client";

import { useRef } from "react";
import { X, Download, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BookingReceipt from "@/components/pdf/BookingReceipt";
import type { Booking, Payment } from "@/components/BookingCard";

interface GuestReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: (Booking & { users: { full_name: string; email: string; phone: string } }) | null;
  payments: Payment[];
}

export default function GuestReceiptModal({
  isOpen,
  onClose,
  booking,
  payments,
}: GuestReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !booking) return null;

  const totalPaid    = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance      = Math.max(0, booking.total_amount - totalPaid);
  const isFullyPaid  = balance <= 0;
  const checkIn      = new Date(booking.check_in_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const checkOut     = new Date(booking.check_out_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const nights       = Math.max(1, Math.ceil(
    (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000
  ));
  const latestPayment = payments[payments.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-[#0A1A44] px-6 py-4 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold font-serif text-lg">Payment Receipt</h2>
            <p className="text-xs text-white/50 mt-0.5">Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="overflow-y-auto flex-1" ref={receiptRef}>
          <div className="p-8 bg-white text-slate-800">

            {/* Brand */}
            <div className="text-center border-b border-slate-100 pb-6 mb-6">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 relative">
                  <Image src="/images/logo/coolstaylogo.jpg" alt="CoolStay" fill className="object-contain" />
                </div>
              </div>
              <h1 className="text-2xl font-serif font-black text-[#0A1A44] tracking-tight">COOLSTAY RESORT</h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Official Receipt</p>
              <p className="text-xs text-slate-400 mt-0.5">123 Beach Road, Paradise City, Philippines</p>
            </div>

            {/* Meta Row */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Receipt No.</p>
                <p className="font-mono text-sm font-bold text-slate-700">
                  #{latestPayment?.id.slice(0, 8).toUpperCase() ?? booking.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Date Issued</p>
                <p className="text-sm font-medium text-slate-700">
                  {latestPayment
                    ? new Date(latestPayment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Billed To */}
            <div className="mb-6 bg-slate-50 p-4 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Billed To</p>
              <h3 className="font-bold text-base text-[#0A1A44]">{booking.users.full_name}</h3>
              {booking.users.email && <p className="text-sm text-slate-500">{booking.users.email}</p>}
              {booking.users.phone && <p className="text-sm text-slate-500">{booking.users.phone}</p>}
            </div>

            {/* Stay Details */}
            <div className="mb-6">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Stay Details</p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Room</span>
                  <span className="font-bold text-slate-800">{booking.room_types?.name ?? "Room"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-in</span>
                  <span className="font-medium text-slate-700">{checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-out</span>
                  <span className="font-medium text-slate-700">{checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium text-slate-700">{nights} night{nights > 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="mb-6">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Payments</p>
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={p.id ?? i} className="flex justify-between items-center text-sm bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2">
                    <div>
                      <span className="font-medium text-slate-700 capitalize">{p.payment_method ?? "Payment"}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700">₱{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t-2 border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Total Bill</span>
                <span className="font-medium">₱{booking.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Total Paid</span>
                <span className="font-bold text-emerald-600">₱{totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#0A1A44] pt-2 border-t border-slate-100">
                <span>{isFullyPaid ? "FULLY PAID" : "BALANCE DUE"}</span>
                <span className={isFullyPaid ? "text-emerald-600" : "text-red-600"}>
                  {isFullyPaid ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> ₱0
                    </span>
                  ) : `₱${balance.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-8 text-center text-xs text-slate-400 border-t border-dashed border-slate-200 pt-6">
              <p>Thank you for staying with CoolStay!</p>
              <p className="mt-0.5">For inquiries, contact us at support@coolstay.com</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <PDFDownloadLink
            document={<BookingReceipt booking={booking} payments={payments} />}
            fileName={`CoolStay_Receipt_${booking.id.slice(0, 8)}.pdf`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0A1A44] text-white hover:bg-blue-900 transition-colors shadow-md active:scale-95"
          >
            {({ loading }) =>
              loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
              ) : (
                <><Download className="w-4 h-4" /> Download Receipt</>
              )
            }
          </PDFDownloadLink>
        </div>
      </div>
    </div>
  );
}
