"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Edit2,
  FileText,
} from "lucide-react"; // Removed 'Download'
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
  } | null;
  onSuccess?: () => void;
  readOnly?: boolean;
}

// NEW: Define proper interface for receipt data
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
  const [verifiedAmount, setVerifiedAmount] = useState<number | string>("");

  // Fixed: Typed state instead of 'any'
  const [fullBookingData, setFullBookingData] =
    useState<BookingReceiptData | null>(null);

  // Removed unused 'isReceiptLoading' state

  useEffect(() => {
    if (payment) {
      setVerifiedAmount(payment.amount);
      fetchBookingDetails(payment.booking_id);
    }
  }, [payment]);

  const fetchBookingDetails = async (bookingId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
            *,
            room_types(name),
            users(full_name, email, phone),
            payments(*)
        `
      )
      .eq("id", bookingId)
      .single();

    // Fixed type casting safely
    if (data && !error) {
      setFullBookingData(data as unknown as BookingReceiptData);
    }
  };

  if (!isOpen || !payment) return null;

  const isFullPayment = payment.amount >= payment.total_booking_amount;
  const paymentTypeLabel = isFullPayment ? "Full Payment" : "Downpayment";

  const handleUpdate = async (status: "completed" | "failed") => {
    if (readOnly) return;

    if (
      status === "completed" &&
      (verifiedAmount === "" || Number(verifiedAmount) < 0)
    ) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      status === "completed" ? "Verifying payment..." : "Rejecting payment..."
    );

    try {
      const res = await fetch("/api/admin/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: payment.id,
          status,
          verified_amount: Number(verifiedAmount),
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.dismiss(toastId);
      toast.success(
        status === "completed" ? "Payment Verified!" : "Payment Rejected"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      // Fixed: Removed unused 'error' variable
      toast.dismiss(toastId);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">
              {readOnly ? "Payment Details" : "Verify Payment"}
            </h2>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isFullPayment
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              {paymentTypeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[300px]">
          <div className="relative w-full h-full min-h-[400px]">
            {payment.proof_url ? (
              <Image
                src={payment.proof_url}
                alt="Proof of Payment"
                fill
                className="object-contain"
              />
            ) : (
              <div className="text-slate-400">No Image Available</div>
            )}
          </div>
        </div>

        {/* Info & Actions */}
        <div className="p-6 bg-white border-t space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">
                Guest Name
              </p>
              <p className="font-bold text-slate-800 text-lg">
                {payment.guest}
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Declared:{" "}
                <span className="font-mono text-slate-600 font-bold">
                  ₱{payment.amount.toLocaleString()}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">
                {readOnly ? "Verified Amount" : "Confirm Received"}
              </p>
              {readOnly ? (
                <p className="font-bold text-xl text-green-600">
                  ₱{payment.amount.toLocaleString()}
                </p>
              ) : (
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-slate-400 font-bold">₱</span>
                  <input
                    type="number"
                    value={verifiedAmount}
                    onChange={(e) =>
                      setVerifiedAmount(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-28 font-bold text-xl text-blue-600 text-right border-b-2 border-slate-200 focus:border-blue-600 outline-none bg-transparent transition-colors"
                  />
                  <Edit2 className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          </div>

          {/* Download Receipt Button (If verified) */}
          {readOnly && fullBookingData && (
            <div className="pt-2">
              <PDFDownloadLink
                document={
                  <BookingReceipt
                    booking={fullBookingData}
                    payments={fullBookingData.payments || []}
                  />
                }
                fileName={`Receipt_${payment.booking_id.substring(0, 8)}.pdf`}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                {/* Fixed: Removed @ts-expect-error as it is handled by the component */}
                {({ loading }) =>
                  loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Download Official Receipt
                    </>
                  )
                }
              </PDFDownloadLink>
            </div>
          )}

          {!readOnly && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleUpdate("failed")}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-5 h-5" /> Reject
              </button>
              <button
                onClick={() => handleUpdate("completed")}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm{" "}
                    {Number(verifiedAmount) !== payment.amount
                      ? "Correction"
                      : "Approve"}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Warning for Discrepancy */}
          {!readOnly &&
            verifiedAmount !== "" &&
            Number(verifiedAmount) !== payment.amount && (
              <div className="bg-yellow-50 text-yellow-700 p-2 rounded-lg text-xs text-center border border-yellow-200">
                ⚠️ You are changing the amount from <b>₱{payment.amount}</b> to{" "}
                <b>₱{verifiedAmount}</b>.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
