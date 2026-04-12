"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Loader2,
  CalendarClock,
  Search,
  Users,
  Clock,
  Briefcase,
  LucideIcon,
  AlertTriangle,
  UserX,
  Plus,
  Eye,
  ChevronDown,
  FileText,
  Mail,
  Phone,
  Milk,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  CalendarDays,
  BedDouble,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import AdminBookingModal from "@/components/admin/AdminBookingModal";
import PaymentProofModal from "@/components/admin/PaymentProofModal";
import TransactionModal from "@/components/admin/TransactionModal";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BookingReceipt from "@/components/pdf/BookingReceipt";
import AdminCheckInModal from "@/components/admin/AdminCheckInModal";

// --- TYPES ---
interface UserProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface RoomType {
  name: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  description?: string | null;
  created_at: string;
  proof_url: string | null;
}

interface PaymentVerification extends Payment {
  guestName?: string | null;
  total_booking_amount: number;
  booking_id: string;
}

interface Booking {
  id: string;
  created_at: string;
  status: string;
  guests_count: number;
  adults: number;
  children: number;
  infants: number;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  payment_status: string;
  room_type_id: string;
  assigned_room_id?: string;
  special_requests?: string;
  security_deposit_amount?: number;
  security_deposit_status?: string;
  security_deposit_notes?: string;
  users: UserProfile | null;
  room_types: RoomType | null;
  payments?: Payment[];
}

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: (e: React.MouseEvent) => void;
  isLoading: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}

interface StatCardProps {
  label: string;
  count: number;
  icon: LucideIcon;
  color: string;
}

// --- STATS COMPONENT ---
function StatCard({ label, count, icon: Icon, color }: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-5 flex-1 min-w-55 group transition-all hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`absolute right-0 top-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-10 transition-transform group-hover:scale-150 ${color}`}
      ></div>
      <div
        className={`p-4 rounded-2xl ${color} bg-opacity-10 text-current relative z-10`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-3xl font-serif font-bold text-slate-800">{count}</p>
      </div>
    </div>
  );
}

const TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Checked In",
  "Cancelled",
  "No Show",
];
const ITEMS_PER_PAGE = 8;

export default function AdminBookingsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [proofToVerify, setProofToVerify] =
    useState<PaymentVerification | null>(null);
  const [transactionPrefill, setTransactionPrefill] = useState<{
    bookingId: string;
    guestName: string;
    amount: number;
  } | null>(null);
  const [noShowConfirmId, setNoShowConfirmId] = useState<string | null>(null);
  const [checkInConfirm, setCheckInConfirm] = useState<Booking | null>(null);
  const [checkOutConfirm, setCheckOutConfirm] = useState<Booking | null>(null);
  const [damageNotes, setDamageNotes] = useState("");

  // ✅ FETCH FUNCTION (Memoized for stability)
  const fetchBookings = useCallback(async (isAutoRefresh = false) => {
    try {
      // Add timestamp to prevent caching
      const res = await fetch(`/api/admin/bookings?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setBookings((prev) => {
        // Optional: Simple check to see if count changed to show a toast
        if (isAutoRefresh && data.length > prev.length) {
          toast.success("New booking received!");
        }
        return data;
      });
    } catch {
      console.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ POLLING STRATEGY (The Fix)
  useEffect(() => {
    // 1. Initial Load
    fetchBookings();

    // 2. Set up Polling Interval (Every 5 seconds)
    const intervalId = setInterval(() => {
      fetchBookings(true); // Pass true to indicate auto-refresh
    }, 5000);

    // 3. Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchBookings]);

  const handleStatusUpdate = async (
    id: string,
    newStatus: string,
    depositStatus?: string,
    depositNotes?: string,
  ) => {
    if (newStatus === "no_show" && !noShowConfirmId) {
      setNoShowConfirmId(id);
      return;
    }

    setProcessingId(id);
    const toastId = toast.loading("Updating...");

    try {
      interface UpdatePayload {
        id: string;
        status: string;
        security_deposit_status?: string;
        security_deposit_notes?: string;
      }

      const payload: UpdatePayload = { id, status: newStatus };

      if (depositStatus) payload.security_deposit_status = depositStatus;
      if (depositNotes) payload.security_deposit_notes = depositNotes;

      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");

      await fetchBookings();
      toast.dismiss(toastId);
      toast.success("Updated successfully");
      setNoShowConfirmId(null);
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to update");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesTab =
      activeTab === "All"
        ? true
        : b.status.toLowerCase().replace("_", " ") === activeTab.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      matchesTab &&
      ((b.users?.full_name?.toLowerCase() || "").includes(searchLower) ||
        b.id.toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Derived Stats
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const checkInCount = bookings.filter((b) => {
    const today = new Date().toDateString();
    return (
      new Date(b.check_in_date).toDateString() === today &&
      b.status === "confirmed"
    );
  }).length;
  const activeCount = bookings.filter((b) => b.status === "checked_in").length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-8 -m-6 font-sans text-slate-800 relative">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-10 gap-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-serif font-black text-[#0A1A44] tracking-tight">
              Reservations
            </h1>
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 rounded-full border border-green-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>
          <p className="text-slate-500 font-medium mt-2">
            Admin Dashboard • Booking Management
          </p>
        </div>
        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          <StatCard
            label="Pending"
            count={pendingCount}
            icon={Clock}
            color="text-yellow-600 bg-yellow-500"
          />
          <StatCard
            label="Arrivals Today"
            count={checkInCount}
            icon={Briefcase}
            color="text-blue-600 bg-blue-500"
          />
          <StatCard
            label="Active Guests"
            count={activeCount}
            icon={Users}
            color="text-green-600 bg-green-500"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 mb-8 sticky top-4 z-20 backdrop-blur-xl">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-[#0A1A44] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-transparent bg-slate-100 focus:bg-white focus:border-blue-100 text-sm font-medium outline-none"
            />
          </div>
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="flex items-center gap-2 bg-[#0A1A44] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Booking</span>
          </button>
          <button
            onClick={() => fetchBookings()}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A1A44]" />
            <p className="text-slate-400 font-medium">
              Syncing reservations...
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
            <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">
              No bookings found
            </h3>
          </div>
        ) : (
          paginatedBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onUpdate={handleStatusUpdate}
              processingId={processingId}
              onVerifyProof={(payment) => setProofToVerify(payment)}
              onReceivePayment={(bookingId, guestName, balance) =>
                setTransactionPrefill({ bookingId, guestName, amount: balance })
              }
              onCheckInClick={(b) => setCheckInConfirm(b)} // ✅ Passed down
              onCheckOutClick={(b) => setCheckOutConfirm(b)} // ✅ Passed down
            />
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && filteredBookings.length > ITEMS_PER_PAGE && (
        <div className="fixed bottom-0 right-0 left-0 md:left-64 p-4 bg-white border-t border-slate-200 flex justify-between items-center z-10 shadow-lg">
          <span className="text-xs font-bold text-slate-400">
            Page {currentPage} of {totalPages} ({filteredBookings.length} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AdminBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={fetchBookings}
      />
      <PaymentProofModal
        isOpen={!!proofToVerify}
        onClose={() => setProofToVerify(null)}
        payment={
          proofToVerify
            ? {
                ...proofToVerify,
                guest: proofToVerify.guestName || "Unknown Guest",
                proof_url: proofToVerify.proof_url || "",
              }
            : null
        }
        onSuccess={fetchBookings}
      />

      {/* ✅ Fixed: Using 'prefill' correctly */}
      <TransactionModal
        isOpen={!!transactionPrefill}
        onClose={() => setTransactionPrefill(null)}
        onSuccess={async () => {
          await fetchBookings();
          setTransactionPrefill(null);
        }}
        prefill={transactionPrefill}
      />

      {noShowConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Mark as No-Show?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  This will cancel the booking and release the room
                  availability. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setNoShowConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(noShowConfirmId, "no_show")}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 text-sm"
                >
                  Confirm No-Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: THE MOVIE SEAT CHECK-IN MODAL */}
      <AdminCheckInModal
        isOpen={!!checkInConfirm}
        onClose={() => setCheckInConfirm(null)}
        booking={
          checkInConfirm
            ? {
                id: checkInConfirm.id,
                guestName: checkInConfirm.users?.full_name || "Guest",
                room_type_id: checkInConfirm.room_type_id,
                roomTypeName: checkInConfirm.room_types?.name || "Room",
              }
            : null
        }
        onSuccess={() => {
          fetchBookings();
          setCheckInConfirm(null);
        }}
      />

      {/* ✅ CHECK-OUT / DEPOSIT CLEARANCE MODAL */}
      {checkOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Room Clearance & Check Out
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Has the room been inspected for damages? Please resolve the ₱1,000
              security deposit.
            </p>

            <div className="space-y-4">
              {/* Option 1: Clean */}
              <button
                onClick={() => {
                  handleStatusUpdate(
                    checkOutConfirm.id,
                    "checked_out",
                    "refunded",
                  );
                  setCheckOutConfirm(null);
                }}
                className="w-full p-4 border border-green-200 bg-green-50 hover:bg-green-100 rounded-xl flex items-start gap-4 transition-colors text-left group"
              >
                <div className="bg-white p-2 rounded-full shadow-sm text-green-600 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-sm">
                    Room is Clear (Refund Deposit)
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Return the ₱1,000 cash to the guest and finalize check-out.
                  </p>
                </div>
              </button>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">
                  OR
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              {/* Option 2: Damage */}
              <div className="p-4 border border-red-200 bg-red-50 rounded-xl space-y-3">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2 rounded-full shadow-sm text-red-600 shrink-0">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800 text-sm">
                      Damages Found (Forfeit Deposit)
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Keep the ₱1,000 to cover resort damages.
                    </p>
                  </div>
                </div>
                <textarea
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  placeholder="Describe the damages (Required)..."
                  className="w-full text-sm p-3 rounded-lg border border-red-200 focus:ring-2 ring-red-500 outline-none"
                  rows={2}
                />
                <button
                  disabled={!damageNotes.trim()}
                  onClick={() => {
                    handleStatusUpdate(
                      checkOutConfirm.id,
                      "checked_out",
                      "forfeited",
                      damageNotes,
                    );
                    setCheckOutConfirm(null);
                    setDamageNotes("");
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Forfeit Deposit & Check Out
                </button>
              </div>
            </div>

            <button
              onClick={() => setCheckOutConfirm(null)}
              className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- REDESIGNED BOOKING CARD ---
interface BookingCardProps {
  booking: Booking;
  onUpdate: (id: string, status: string) => Promise<void>;
  processingId: string | null;
  onVerifyProof: (payment: PaymentVerification) => void;
  onReceivePayment: (id: string, name: string, balance: number) => void;
  onCheckInClick: (booking: Booking) => void; // ✅ NEW
  onCheckOutClick: (booking: Booking) => void; // ✅ NEW
}

function BookingCard({
  booking,
  onUpdate,
  processingId,
  onVerifyProof,
  onReceivePayment,
  onCheckInClick,
  onCheckOutClick,
}: BookingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isProcessing = processingId === booking.id;

  // Logic
  const checkInDate = new Date(booking.check_in_date);
  const checkOutDate = new Date(booking.check_out_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkInDate.setHours(0, 0, 0, 0);
  const isEarly = today < checkInDate;
  const isOverdue = today > checkInDate && booking.status === "confirmed";

  // Financials
  const totalAmount = booking.total_amount || 0;
  const completedPayments =
    booking.payments?.filter(
      (p) => p.status === "completed" || p.status === "paid",
    ) || [];
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = totalAmount - totalPaid;
  const isFullyPaid = balanceDue <= 0;
  const pendingProof = (booking.payments || []).find(
    (p) => p.status === "pending" && p.proof_url,
  );

  // Status Config
  const statusConfig: Record<
    string,
    { label: string; color: string; border: string }
  > = {
    pending: {
      label: "Pending",
      color: "text-yellow-700 bg-yellow-100 border-yellow-200",
      border: "bg-yellow-400",
    },
    confirmed: {
      label: "Confirmed",
      color: "text-green-700 bg-green-100 border-green-200",
      border: "bg-green-500",
    },
    checked_in: {
      label: "In House",
      color: "text-blue-700 bg-blue-100 border-blue-200",
      border: "bg-blue-500",
    },
    checked_out: {
      label: "Completed",
      color: "text-slate-600 bg-slate-100 border-slate-200",
      border: "bg-slate-400",
    },
    cancelled: {
      label: "Cancelled",
      color: "text-red-700 bg-red-100 border-red-200",
      border: "bg-red-500",
    },
    no_show: {
      label: "No Show",
      color: "text-purple-700 bg-purple-100 border-purple-200",
      border: "bg-purple-500",
    },
  };
  const status = statusConfig[booking.status] || statusConfig.pending;

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-300 hover:shadow-md ${isOverdue ? "border-red-300 ring-4 ring-red-50" : "border-slate-100"}`}
    >
      {/* Overdue Banner */}
      {isOverdue && (
        <div className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3 h-3" /> Booking is Overdue for Check-In
        </div>
      )}

      {/* Main Grid Content */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center cursor-pointer"
      >
        {/* COL 1-4: Guest & Room Info */}
        <div className="lg:col-span-4 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0A1A44] flex items-center justify-center font-serif font-bold text-lg border border-slate-200">
              {booking.users?.full_name?.charAt(0) || "G"}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${status.border}`}
            ></div>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-base truncate">
              {booking.users?.full_name || "Guest"}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium truncate max-w-35 flex items-center gap-1">
                <BedDouble className="w-3 h-3" /> {booking.room_types?.name}
              </span>
            </div>
          </div>
        </div>

        {/* COL 5-8: Dates & Pax (UPDATED) */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 border-l border-slate-100 pl-0 sm:pl-6">
          {/* Dates */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="font-medium">
                {checkInDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {" - "}
                {checkOutDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-6">
              {Math.ceil(
                (checkOutDate.getTime() - checkInDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )}{" "}
              Night(s) Stay
            </span>
          </div>

          {/* Pax Breakdown (Adults, Kids, Infants) */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-slate-700">
                {booking.adults}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">Adl</span>
            </div>
            {booking.children > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-slate-700">
                    {booking.children}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    Chd
                  </span>
                </div>
              </>
            )}
            {booking.infants > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    {booking.infants} <Milk className="w-3 h-3 text-blue-400" />
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    Inf
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COL 9-12: Status & Actions */}
        <div className="lg:col-span-4 flex flex-col items-end gap-3 pl-0 sm:pl-6 border-l border-slate-100">
          {/* Top Row: Status & Amount */}
          <div className="flex items-center justify-between w-full">
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${status.color}`}
            >
              {status.label}
            </span>
            <div className="text-right">
              <p className="text-sm font-bold text-[#0A1A44]">
                ₱{totalAmount.toLocaleString()}
              </p>
              {!isFullyPaid && (
                <p className="text-[10px] font-bold text-red-500">
                  Due: ₱{balanceDue.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-2 w-full mt-1">
            {/* Review Proof Button */}
            {pendingProof && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerifyProof({
                    ...pendingProof,
                    guestName: booking.users?.full_name,
                    total_booking_amount: booking.total_amount,
                    booking_id: booking.id,
                  });
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm animate-pulse"
              >
                <Eye className="w-3.5 h-3.5" /> Review Proof
              </button>
            )}

            {/* Payment Button */}
            {!isFullyPaid && booking.status !== "cancelled" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReceivePayment(
                    booking.id,
                    booking.users?.full_name || "Guest",
                    balanceDue,
                  );
                }}
                className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200"
                title="Record Payment"
              >
                <CreditCard className="w-4 h-4" />
              </button>
            )}

            {/* Dynamic Status Actions */}
            {booking.status === "pending" && !pendingProof && (
              <div className="flex gap-2">
                <ActionButton
                  icon={XCircle}
                  label="Reject"
                  color="text-red-600 bg-red-50 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(booking.id, "cancelled");
                  }}
                  isLoading={isProcessing}
                  variant="danger"
                />
                <ActionButton
                  icon={CheckCircle}
                  label="Confirm"
                  color="bg-[#0A1A44] text-white hover:bg-blue-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(booking.id, "confirmed");
                  }}
                  isLoading={isProcessing}
                  variant="primary"
                />
              </div>
            )}

            {booking.status === "confirmed" && (
              <div className="flex gap-2">
                {!isEarly && (
                  <ActionButton
                    icon={UserX}
                    label="No Show"
                    color="text-slate-500 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(booking.id, "no_show");
                    }}
                    isLoading={isProcessing}
                    variant="ghost"
                  />
                )}
                <ActionButton
                  icon={LogIn}
                  label="Check In"
                  color="bg-green-600 text-white hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckInClick(booking);
                  }}
                  isLoading={isProcessing}
                  disabled={isEarly}
                />
              </div>
            )}

            {booking.status === "checked_in" && (
              <ActionButton
                icon={LogOut}
                label="Check Out"
                color="bg-slate-800 text-white hover:bg-black"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckOutClick(booking); // ✅ Changed
                }}
                isLoading={isProcessing}
              />
            )}

            {/* Expand Arrow */}
            <div
              className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Contact & Notes */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Guest Contact
              </h4>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {booking.users?.email || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {booking.users?.phone || "N/A"}
                </div>
              </div>

              {booking.special_requests && (
                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                  <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">
                    Special Request
                  </p>
                  <p className="text-xs text-yellow-800 italic">
                    &quot;{booking.special_requests}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Transaction Log */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Transactions
                </h4>
                {totalPaid > 0 && (
                  <PDFDownloadLink
                    document={
                      <BookingReceipt
                        booking={booking}
                        payments={completedPayments}
                      />
                    }
                    fileName={`Receipt_${booking.id.substring(0, 8)}.pdf`}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Receipt
                  </PDFDownloadLink>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm text-xs">
                {completedPayments.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic">
                    No payments recorded.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {completedPayments.map((p, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-2.5"
                      >
                        <span className="font-medium text-slate-700 capitalize flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-green-500" />{" "}
                          {(p.payment_method || "cash").replace("_", " ")}
                        </span>
                        <span className="text-slate-500">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-bold text-[#0A1A44]">
                          ₱{p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-slate-50 p-2.5 flex justify-between items-center border-t border-slate-200 font-bold">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Total Paid
                  </span>
                  <span className="text-green-600">
                    ₱{totalPaid.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  color,
  onClick,
  isLoading,
  variant = "primary",
  disabled,
}: ActionButtonProps) {
  // Styles for different variants
  const variants = {
    primary:
      "px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5",
    secondary:
      "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 hover:shadow-sm flex items-center gap-1.5",
    danger:
      "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 hover:shadow-sm flex items-center gap-1.5",
    ghost:
      "p-1.5 rounded-lg transition-all hover:bg-slate-100 flex items-center gap-1.5 text-xs font-bold",
  };

  const variantStyle = variants[variant] || variants.primary;

  // If ghost, we might hide label on small screens or just show icon
  const showLabel = variant !== "ghost";

  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`${variantStyle} ${color}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
