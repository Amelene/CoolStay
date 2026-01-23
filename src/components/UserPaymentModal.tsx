"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image"; // ✅ Import Image component
import {
  X,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UserPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    total_amount: number;
  };
  onSuccess: () => void;
}

export default function UserPaymentModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: UserPaymentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // LOGIC: Downpayment is now strict 20%
  const downpaymentAmount = booking.total_amount * 0.2;
  const [amountToPay, setAmountToPay] = useState<number>(downpaymentAmount);

  // STRICT: User must agree to non-refundable policy
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountToPay(downpaymentAmount);
      setFile(null);
      setPolicyAgreed(false);
    }
  }, [isOpen, booking.total_amount, downpaymentAmount]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please attach your proof of payment.");
      return;
    }

    if (!policyAgreed) {
      toast.error("You must agree to the Non-Refundable Policy.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Verifying payment details...");

    try {
      const supabase = createClient();

      // 1. Upload Image
      const fileExt = file.name.split(".").pop();
      const fileName = `${booking.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // 3. Record Transaction
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          amount: amountToPay,
          method: "gcash",
          proof_url: urlData.publicUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to record payment");

      toast.dismiss(toastId);

      // STRICT POST-BOOKING WARNING
      toast.success("Payment Submitted!", {
        description: "Reminder: Your downpayment is non-refundable.",
        duration: 6000,
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.dismiss(toastId);
      let msg = "An error occurred";
      if (error instanceof Error) msg = error.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-[#0A1A44] p-5 md:p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/10">
              <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-serif tracking-tight">
                Confirm Reservation
              </h2>
              <p className="text-slate-300 text-xs md:text-sm font-medium">
                Secure your booking with a downpayment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-0 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col md:grid md:grid-cols-2 h-full divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* LEFT: QR Code & Warning */}
            <div className="p-6 md:p-8 flex flex-col bg-slate-50">
              {/* STRICT WARNING BOX */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-700 uppercase tracking-wide">
                      Strict No Refund Policy
                    </h4>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">
                      The 20% downpayment is strictly <b>non-refundable</b> and
                      non-transferable. Cancellations made after payment will
                      result in forfeiture of this amount.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-4 w-full max-w-xs">
                  <div className="relative aspect-square bg-[#0057E7]/5 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                    <Image
                      src="/images/gcash_qr.jpg"
                      alt="GCash QR Code"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center font-medium">
                  Scan using the GCash App to pay <b>CoolStay Resort</b>
                </p>
              </div>
            </div>

            {/* RIGHT: Input & Upload */}
            <div className="p-6 md:p-8 flex flex-col justify-center bg-white relative">
              {/* AMOUNT SECTION */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#0A1A44] mb-2 uppercase tracking-wide">
                  Payment Amount
                </label>

                {/* READ ONLY INPUT */}
                <div className="relative mb-3 group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 group-hover:text-slate-500 transition-colors">
                    ₱
                  </span>
                  <input
                    type="number"
                    readOnly // STRICT: User cannot edit
                    value={amountToPay}
                    className="w-full pl-10 pr-4 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-2xl font-bold text-slate-500 cursor-not-allowed outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded">
                    FIXED
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAmountToPay(downpaymentAmount)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                      amountToPay === downpaymentAmount
                        ? "bg-[#0A1A44] border-[#0A1A44] text-white shadow-md"
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    20% Downpayment
                  </button>
                  <button
                    onClick={() => setAmountToPay(booking.total_amount)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                      amountToPay === booking.total_amount
                        ? "bg-[#0A1A44] border-[#0A1A44] text-white shadow-md"
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    Pay Full Amount
                  </button>
                </div>

                <div className="flex justify-between items-center mt-3 px-1">
                  <p className="text-xs text-slate-400 font-medium">
                    Total Cost
                  </p>
                  <p className="text-xs font-bold text-[#0A1A44]">
                    ₱{booking.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#0A1A44] mb-2 uppercase tracking-wide">
                  Upload Receipt
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                        relative group w-full min-h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300
                        ${
                          file
                            ? "border-green-500 bg-green-50/30"
                            : "border-slate-300 hover:border-[#0A1A44] hover:bg-slate-50"
                        }
                      `}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />

                  {file ? (
                    <div className="text-center p-4 animate-in zoom-in-50">
                      <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <p className="font-bold text-slate-800 text-xs truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-green-600 font-bold uppercase">
                        Attached
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#0A1A44] mx-auto mb-1 transition-colors" />
                      <p className="font-bold text-xs text-slate-500 group-hover:text-[#0A1A44]">
                        Tap to attach screenshot
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* MANDATORY AGREEMENT */}
              <div className="mb-6">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-red-100 bg-red-50/50 cursor-pointer hover:bg-red-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={policyAgreed}
                    onChange={(e) => setPolicyAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium leading-relaxed select-none">
                    I acknowledge that the{" "}
                    <b>₱{amountToPay.toLocaleString()}</b> payment is{" "}
                    <span className="text-red-600 font-bold">
                      NON-REFUNDABLE
                    </span>{" "}
                    and implies commitment to this booking.
                  </span>
                </label>
              </div>

              <button
                onClick={handleSubmit}
                // STRICT: Disable if no file OR no agreement
                disabled={loading || !file || !policyAgreed}
                className="w-full bg-[#0A1A44] hover:bg-[#0A1A44]/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirm Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
