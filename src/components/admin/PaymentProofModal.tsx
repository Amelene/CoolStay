"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  ChevronDown,
} from "lucide-react";

const REJECTION_REASONS = [
  "Blurry receipt",
  "Wrong amount",
  "Duplicate receipt",
  "Invalid proof of payment",
  "Edited/suspicious receipt",
  "Wrong account/payment destination",
  "Other / specify below",
] as const;
import { toast } from "sonner";
import Image from "next/image";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BookingReceipt from "@/components/pdf/BookingReceipt";
import { createClient } from "@/lib/supabase/client";

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    guest: string;
    amount: number;
    proof_url: string;
    total_booking_amount: number;
    booking_id: string;
    status: string;
  } | null;
  onSuccess?: () => void;
  readOnly?: boolean;
}

interface BookingReceiptData {
  id: string;
  total_amount: number;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  room_types: { name: string } | null;
  users: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  payments: Array<{
    amount: number;
    status: string;
    payment_method: string;
    description?: string | null;
    created_at: string;
  }>;
}

export default function PaymentProofModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
  readOnly = false,
}: PaymentProofModalProps) {
  const [loading, setLoading] = useState(false);

  // Rejection Workflow States
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionCustomNote, setRejectionCustomNote] = useState("");

  // Derived: the value sent to the API
  const rejectionRemarks =
    rejectionReason === "Other / specify below"
      ? rejectionCustomNote.trim()
      : rejectionReason;
  const isOtherSelected = rejectionReason === "Other / specify below";

  const [fullBookingData, setFullBookingData] =
    useState<BookingReceiptData | null>(null);

  const isLocked =
    readOnly ||
    (payment &&
      (payment.status === "completed" ||
        payment.status === "paid" ||
        payment.status === "failed"));

  useEffect(() => {
    if (isOpen && payment?.id) {
      setIsRejecting(false);
      setRejectionReason("");
      setRejectionCustomNote("");
      fetchBookingDetails(payment.booking_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, payment?.id]);

  const fetchBookingDetails = async (bookingId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `*, room_types(name), users(full_name, email, phone), payments(*)`,
      )
      .eq("id", bookingId)
      .single();

    if (data && !error) {
      setFullBookingData(data as unknown as BookingReceiptData);
    }
  };

  if (!isOpen || !payment) return null;

  const isFullPayment = payment.amount >= payment.total_booking_amount;
  const paymentTypeLabel = isFullPayment ? "Full Payment" : "Downpayment";

  const handleUpdate = async (status: "completed" | "failed") => {
    if (isLocked) return;

    setLoading(true);
    const toastId = toast.loading(
      status === "completed" ? "Verifying payment..." : "Rejecting payment...",
    );

    try {
      const res = await fetch("/api/admin/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: payment.id,
          status,
          verified_amount: status === "completed" ? payment.amount : 0, // Automatically uses the exact payment amount
          description:
            status === "failed"
              ? rejectionRemarks
              : "Payment verified by Admin",
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.dismiss(toastId);
      toast.success(
        status === "completed" ? "Payment Verified!" : "Payment Rejected",
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch {
      toast.dismiss(toastId);
      toast.error("An error occurred updating the payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden">
        {/* FIXED HEADER */}
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-lg">
              {isLocked ? "Payment Details" : "Verify Payment"}
            </h2>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                payment.status === "failed"
                  ? "bg-red-500 text-white"
                  : isFullPayment
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 text-white"
              }`}
            >
              {payment.status === "failed" ? "Rejected" : paymentTypeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {/* Image Section */}
          <div className="bg-[#F5F8FA] p-4 flex items-center justify-center min-h-62.5 shrink-0">
            <div className="relative w-full h-full min-h-75 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {payment.proof_url ? (
                <Image
                  src={payment.proof_url}
                  alt="Proof of Payment"
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 font-medium">
                  No Image Available
                </div>
              )}
            </div>
          </div>

          {/* Controls Section */}
          <div className="p-6 bg-white border-t border-slate-100 space-y-4 shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Guest Name
                </p>
                <p className="font-black text-slate-800 text-lg">
                  {payment.guest}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1 tracking-wider">
                  {isLocked ? "Verified Amount" : "Declared Amount"}
                </p>
                <p
                  className={`font-black text-xl ${payment.status === "failed" ? "text-red-500 line-through opacity-70" : "text-blue-600"}`}
                >
                  ₱{payment.amount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Download Receipt Button (Only if successful) */}
            {isLocked && payment.status !== "failed" && fullBookingData && (
              <div className="pt-2 border-t border-slate-100">
                <PDFDownloadLink
                  document={
                    <BookingReceipt
                      booking={fullBookingData}
                      payments={fullBookingData.payments || []}
                    />
                  }
                  fileName={`Receipt_${payment.booking_id.substring(0, 8)}.pdf`}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-slate-200 shadow-sm"
                >
                  {({ loading }) =>
                    loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-blue-500" /> Download
                        Official Receipt
                      </>
                    )
                  }
                </PDFDownloadLink>
              </div>
            )}

            {/* Action Buttons (Approve / Reject Workflow) */}
            {!isLocked && (
              <div className="pt-2 border-t border-slate-100">
                {isRejecting ? (
                  <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                    {/* Reason Dropdown */}
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1.5">
                        Select Rejection Reason
                      </p>
                      <div className="relative">
                        <select
                          value={rejectionReason}
                          onChange={(e) => {
                            setRejectionReason(e.target.value);
                            setRejectionCustomNote("");
                          }}
                          disabled={loading}
                          className="w-full appearance-none pl-3 pr-9 py-3 border border-red-200 bg-red-50/40 rounded-xl text-sm font-medium text-red-900 focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50 cursor-pointer"
                        >
                          <option value="" disabled>
                            — Choose a reason —
                          </option>
                          {REJECTION_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      </div>
                    </div>

                    {/* Custom note — only shown when "Other" is selected */}
                    {isOtherSelected && (
                      <div className="animate-in slide-in-from-top-1 duration-150">
                        <textarea
                          placeholder="Please describe the issue in detail..."
                          value={rejectionCustomNote}
                          onChange={(e) => setRejectionCustomNote(e.target.value)}
                          disabled={loading}
                          className="w-full px-3 py-3 border border-red-200 bg-red-50/30 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none h-20 placeholder:text-red-300 text-red-900 font-medium disabled:opacity-50"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsRejecting(false);
                          setRejectionReason("");
                          setRejectionCustomNote("");
                        }}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate("failed")}
                        disabled={loading || !rejectionRemarks.trim()}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Confirm Rejection"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsRejecting(true)}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                    <button
                      onClick={() => handleUpdate("completed")}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" /> Approve Payment
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
