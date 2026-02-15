"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

// Types
interface BookingOption {
  id: string;
  guest_name: string;
  total_amount: number;
  balance: number;
  paid: number;
  room_name?: string;
}

interface BookingSearchResult {
  id: string;
  total_amount: number;
  users: {
    full_name: string | null;
  } | null;
  room_types: {
    name: string;
  } | null;
  payments: {
    amount: number;
    status: string;
  }[];
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefill?: {
    bookingId: string;
    guestName: string;
    amount: number;
  } | null;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  prefill,
}: TransactionModalProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [amount, setAmount] = useState<number | string>("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingOption | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);

  // 1. Handle Prefill Logic
  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setMethod("cash");

      if (prefill) {
        setSelectedBooking({
          id: prefill.bookingId,
          guest_name: prefill.guestName,
          total_amount: 0,
          paid: 0,
          balance: prefill.amount,
        });
        setAmount(prefill.amount);
      } else {
        setSelectedBooking(null);
        setAmount("");
        setSearchQuery("");
        setBookings([]);
      }
    }
  }, [isOpen, prefill]);

  // 2. Search Logic
  useEffect(() => {
    if (!prefill && searchQuery.length > 2) {
      const search = async () => {
        setIsSearching(true);
        const supabase = createClient();

        // Search bookings by guest name
        const { data } = await supabase
          .from("bookings")
          .select(
            `
            id, 
            total_amount, 
            users!inner(full_name),
            room_types(name),
            payments(amount, status)
          `,
          )
          .ilike("users.full_name", `%${searchQuery}%`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (data) {
          const formatted = (data as unknown as BookingSearchResult[]).map(
            (b) => {
              // Calculate Balance
              const totalPaid = b.payments
                .filter((p) => p.status === "completed" || p.status === "paid")
                .reduce((sum, p) => sum + p.amount, 0);

              return {
                id: b.id,
                guest_name: b.users?.full_name || "Unknown",
                room_name: b.room_types?.name,
                total_amount: b.total_amount,
                paid: totalPaid,
                balance: b.total_amount - totalPaid,
              };
            },
          );
          setBookings(formatted);
        }
        setIsSearching(false);
      };

      const timer = setTimeout(search, 500);
      return () => clearTimeout(timer);
    } else {
      setBookings([]);
    }
  }, [searchQuery, prefill]);

  const handleSubmit = async () => {
    if (!selectedBooking || !amount) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          amount: Number(amount),
          method,
          type: "payment", // ✅ STRICT PAYMENT ONLY
          notes: notes || "Manual payment recorded",
        }),
      });

      if (!res.ok) throw new Error("Failed to record transaction");

      toast.success("Transaction recorded!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Error recording transaction");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center shrink-0">
          <h2 className="font-bold">Record Payment</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* 1. Guest Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Guest / Booking
            </label>
            {prefill ? (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 font-bold flex justify-between items-center">
                <span>{prefill.guestName}</span>
                <span className="text-xs bg-blue-200 px-2 py-1 rounded text-blue-800">
                  LOCKED
                </span>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search guest name..."
                    className="w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 ring-blue-100 outline-none transition-all"
                    value={
                      selectedBooking ? selectedBooking.guest_name : searchQuery
                    }
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedBooking(null);
                    }}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Dropdown Results */}
                {!selectedBooking && bookings.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-xl border rounded-lg mt-1 z-10 max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedBooking(b);
                          setBookings([]);
                          if (b.balance > 0) setAmount(b.balance);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-slate-800">
                              {b.guest_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {b.room_name || "Room"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xs font-bold ${
                                b.balance > 0
                                  ? "text-red-500"
                                  : "text-green-500"
                              }`}
                            >
                              {b.balance > 0
                                ? `Due: ₱${b.balance.toLocaleString()}`
                                : "Paid"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SELECTED BOOKING DETAILS CARD */}
          {selectedBooking && !prefill && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Total Bill:</span>
                <span className="font-medium">
                  ₱{selectedBooking.total_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid So Far:</span>
                <span className="font-medium text-green-600">
                  ₱{selectedBooking.paid.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
                <span>Balance Remaining:</span>
                <span
                  className={`${
                    selectedBooking.balance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  ₱{selectedBooking.balance.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* 2. Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₱
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg outline-none focus:ring-2 ring-[#0A1A44]"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* 3. Method Only (No Refund Type) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm font-bold bg-white focus:ring-2 ring-blue-100 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
            </select>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 ring-blue-100 outline-none"
              placeholder="e.g. Balance payment upon arrival"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedBooking || !amount}
            className="w-full py-6 text-base shadow-lg bg-[#0A1A44] hover:bg-blue-900 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
