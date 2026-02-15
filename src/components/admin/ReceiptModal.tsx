"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";
import Image from "next/image";

interface ReceiptData {
  id: string;
  guest: string;
  email: string;
  phone: string;
  amount: number;
  method: string;
  date: string;
  room_name: string;
  check_in: string;
  check_out: string;
  type: "Payment" | "Refund";
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  data,
}: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    // This triggers the browser print dialog
    // The CSS @media print handles hiding the background/buttons
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in print:p-0 print:bg-white print:fixed print:inset-0 print:z-99999">
      {/* Container (Hidden when printing, except the receipt part) */}
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:w-full print:h-auto print:rounded-none">
        {/* Header (No Print) */}
        <div className="bg-[#0A1A44] p-5 text-white flex justify-between items-center print:hidden">
          <h2 className="font-bold font-serif">Transaction Receipt</h2>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- ACTUAL RECEIPT (Printable Area) --- */}
        <div
          ref={printRef}
          className="p-8 bg-white text-slate-800 print:p-0 print:w-full"
        >
          {/* Brand Header */}
          <div className="text-center border-b border-slate-100 pb-6 mb-6">
            <div className="flex justify-center mb-3">
              {/* Replace with your actual Logo if available, or text */}
              <div className="w-16 h-16 relative">
                <Image
                  src="/images/logo/coolstaylogo.jpg"
                  alt="CoolStay"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-serif font-black text-[#0A1A44] tracking-tight">
              COOLSTAY RESORT
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              Official Receipt
            </p>
            <p className="text-xs text-slate-400 mt-1">
              123 Beach Road, Paradise City, Philippines
            </p>
          </div>

          {/* Transaction Meta */}
          <div className="flex justify-between items-end mb-8">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Receipt No.
              </p>
              <p className="font-mono text-sm font-bold text-slate-700">
                #{data.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Date Issued
              </p>
              <p className="font-medium text-sm text-slate-700">{data.date}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8 bg-slate-50 p-4 rounded-xl print:bg-transparent print:p-0 print:border print:border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">
              Billed To
            </p>
            <h3 className="font-bold text-lg text-[#0A1A44]">{data.guest}</h3>
            <p className="text-sm text-slate-500">{data.email}</p>
            <p className="text-sm text-slate-500">{data.phone}</p>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase border-b border-slate-200 pb-2 mb-4">
              <span>Description</span>
              <span>Amount</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-slate-700 block">
                    {data.room_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {data.check_in
                      ? new Date(data.check_in).toLocaleDateString()
                      : "N/A"}{" "}
                    -{" "}
                    {data.check_out
                      ? new Date(data.check_out).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                {/* For simple receipts, we show the payment amount as the main item */}
                <span className="font-medium"></span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-600">
                  {data.type} via{" "}
                  <span className="uppercase font-bold">{data.method}</span>
                </span>
                <span className="font-bold text-slate-800">
                  ₱{Math.abs(data.amount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 border-slate-800 pt-4 flex justify-between items-center mb-8">
            <span className="font-bold text-xl text-[#0A1A44]">TOTAL PAID</span>
            <span className="font-black text-2xl text-[#0A1A44]">
              ₱{Math.abs(data.amount).toLocaleString()}
            </span>
          </div>

          {/* Footer Message */}
          <div className="text-center text-xs text-slate-400 pt-8 border-t border-dashed border-slate-200">
            <p className="mb-1">Thank you for staying with CoolStay!</p>
            <p>For inquiries, contact us at support@coolstay.com</p>
          </div>
        </div>

        {/* Footer Actions (No Print) */}
        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0A1A44] text-white hover:bg-blue-900 transition-colors flex items-center gap-2 shadow-lg active:scale-95"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>

      {/* Global Print Styles to hide everything else */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* Only show the modal content */
          .fixed,
          .fixed * {
            visibility: visible;
          }
          /* Hide the modal overlay background */
          .fixed {
            background: white !important;
            position: absolute;
            left: 0;
            top: 0;
          }
          /* Hide non-printable elements inside the modal */
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
