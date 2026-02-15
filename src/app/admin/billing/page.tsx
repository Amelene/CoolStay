"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Eye,
  FileText,
} from "lucide-react";
import TransactionModal from "@/components/admin/TransactionModal";
// Removed ReceiptModal import as we are consolidating to PaymentProofModal
import PaymentProofModal from "@/components/admin/PaymentProofModal";

type Invoice = {
  id: string;
  guest: string;
  email: string;
  phone: string;
  amount: number;
  status: string;
  date: string;
  type: "Payment" | "Refund";
  method: string;
  room_name: string;
  check_in: string;
  check_out: string;
  proof_url?: string;
  // NEW FIELDS to match API and Modal requirements
  booking_id: string;
  total_booking_amount: number;
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);

  // We use the same state for both Verification and Viewing
  const [selectedPayment, setSelectedPayment] = useState<Invoice | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/billing");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Helper to open modal
  const openModal = (inv: Invoice, readOnly: boolean) => {
    setSelectedPayment(inv);
    setIsReadOnly(readOnly);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F0F8FF] p-8 -m-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            Billing & Transactions
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor revenue, cash flow, and refunds.
          </p>
        </div>

        <button
          onClick={() => setIsTransModalOpen(true)}
          className="bg-[#0A1A44] hover:bg-blue-900 text-white px-5 py-3 rounded-full font-bold text-sm tracking-wide transition-all shadow-md flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Record Transaction
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:flex px-8 py-4 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div className="w-[15%]">Reference</div>
          <div className="w-[20%]">Guest Name</div>
          <div className="w-[15%]">Date</div>
          <div className="w-[15%]">Method</div>
          <div className="w-[15%] text-right">Amount</div>
          <div className="w-[20%] text-right">Status</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-200" />
              <span>Loading transactions...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No transactions found.
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col md:flex-row items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors group cursor-default"
              >
                {/* 1. Reference */}
                <div className="md:w-[15%] flex items-center gap-3 w-full mb-2 md:mb-0">
                  <div
                    className={`p-2 rounded-full ${
                      inv.type === "Refund"
                        ? "bg-red-50 text-red-500"
                        : "bg-green-50 text-green-500"
                    }`}
                  >
                    {inv.type === "Refund" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0A1A44] font-mono truncate w-20">
                      {inv.id.substring(0, 8)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 md:hidden">
                      {inv.type}
                    </span>
                  </div>
                </div>

                {/* 2. Guest */}
                <div className="md:w-[20%] w-full mb-1 md:mb-0 text-sm font-medium text-slate-700">
                  {inv.guest}
                </div>

                {/* 3. Date */}
                <div className="md:w-[15%] w-full mb-1 md:mb-0 text-sm text-slate-500">
                  {inv.date}
                </div>

                {/* 4. Method */}
                <div className="md:w-[15%] w-full mb-1 md:mb-0 text-sm font-bold uppercase text-slate-400">
                  {inv.method}
                </div>

                {/* 5. Amount & Receipt Link */}
                <div className="md:w-[15%] w-full flex flex-col items-end justify-center mb-2 md:mb-0">
                  <span
                    className={`font-bold text-base ${
                      inv.type === "Refund" ? "text-red-500" : "text-[#0A1A44]"
                    }`}
                  >
                    {inv.type === "Refund" ? "-" : "+"} ₱
                    {Math.abs(inv.amount).toLocaleString()}
                  </span>

                  {/* Consolidate: "View Receipt" just opens the modal in ReadOnly mode */}
                  <button
                    onClick={() => openModal(inv, true)}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#0A1A44] flex items-center gap-1 mt-1 transition-colors"
                  >
                    <FileText className="w-3 h-3" /> Receipt
                  </button>
                </div>

                {/* 6. Status & Actions */}
                <div className="md:w-[20%] w-full flex justify-end gap-2 items-center">
                  {/* VERIFY BUTTON (Only for Pending) */}
                  {inv.status === "pending" ? (
                    <button
                      onClick={() => openModal(inv, false)} // ReadOnly = false (Edit Mode)
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-1 animate-pulse"
                    >
                      <Eye className="w-3 h-3" /> Verify
                    </button>
                  ) : (
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide
                        ${
                          inv.status === "paid" || inv.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : inv.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {inv.status === "paid" || inv.status === "completed" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {inv.status}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE TRANSACTION MODAL */}
      <TransactionModal
        isOpen={isTransModalOpen}
        onClose={() => setIsTransModalOpen(false)}
        onSuccess={fetchInvoices}
      />

      {/* UNIFIED PAYMENT / RECEIPT MODAL */}
      <PaymentProofModal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        payment={
          selectedPayment
            ? {
                id: selectedPayment.id,
                guest: selectedPayment.guest,
                amount: selectedPayment.amount,
                proof_url: selectedPayment.proof_url || "",
                // These fields are now available in the Invoice type
                total_booking_amount: selectedPayment.total_booking_amount,
                booking_id: selectedPayment.booking_id,
              }
            : null
        }
        readOnly={isReadOnly}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}
