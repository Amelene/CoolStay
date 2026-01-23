"use client";

import Navbar from "@/components/Navbar";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import Link from "next/link";
import HomeFooter from "@/components/HomeFooter";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import ReviewModal from "@/components/ReviewModal";
import UserPaymentModal from "@/components/UserPaymentModal";
import { toast } from "sonner";
import {
  Star,
  CreditCard,
  Download,
  Loader2,
  CalendarDays,
  Users,
  Baby,
  Milk,
  Hash,
  MapPin,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BookingReceipt from "@/components/pdf/BookingReceipt";

// --- TYPES ---
interface RoomType {
  id: string;
  name: string;
  image_url: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  description?: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  // ✅ Updated Guest Fields
  guests_count: number;
  adults: number;
  children: number;
  infants: number;
  room_types: RoomType | null;
  payments?: Payment[];
}

// --- COMPONENTS ---
const WelcomeContent = ({ userName }: { userName: string }) => {
  return (
    <div className="text-white space-y-6 text-center lg:text-left animate-in fade-in slide-in-from-left-10 duration-700">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight drop-shadow-lg font-serif">
        Welcome back, <br /> {userName}!
      </h1>
      <p className="text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0 drop-shadow-md font-medium">
        Your exclusive resort experience awaits. View your upcoming trips below.
      </p>
      <div className="flex justify-center lg:justify-start pt-4">
        <Link href="/accommodation">
          <Button
            variant="primary"
            rounded="full"
            size="lg"
            className="bg-[#0A1A44] hover:bg-[#0A1A44]/90 px-10 border border-white/20 shadow-lg transition-transform hover:scale-105"
          >
            BOOK ANOTHER STAY
          </Button>
        </Link>
      </div>
    </div>
  );
};

const BookingCard = ({
  booking,
  onCancel,
  onReview,
  onPay,
  hasReviewed,
  user,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
  onReview: (booking: Booking) => void;
  onPay: (booking: Booking) => void;
  hasReviewed: boolean;
  user: User | null;
}) => {
  const room = booking.room_types;
  const checkIn = new Date(booking.check_in_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

  const validPayments =
    booking.payments?.filter((p) => p.status === "completed") || [];
  const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const isFullyPaid = totalPaid >= booking.total_amount;
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
    confirmed: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    checked_in: "bg-blue-100 text-blue-700 border-blue-200",
    checked_out: "bg-slate-100 text-slate-700 border-slate-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const currentStatusStyle =
    statusStyles[booking.status as keyof typeof statusStyles] ||
    statusStyles.pending;

  return (
    <div className="group relative bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-xl border border-white/40 transition-all hover:scale-[1.01] hover:shadow-2xl overflow-hidden">
      {/* Decorative Gradient Bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 ${booking.status === "confirmed" ? "bg-green-500" : booking.status === "pending" ? "bg-yellow-400" : "bg-slate-300"}`}
      />

      <div className="flex flex-col md:flex-row gap-6 pl-3">
        {/* IMAGE SECTION */}
        <div className="w-full md:w-40 h-40 relative rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-100">
          <Image
            src={room?.image_url || "/images/background/coolstaybg.png"}
            alt={room?.name || "Room"}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-[#0A1A44] shadow-sm flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Resort View
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[#0A1A44] font-bold font-serif text-2xl leading-tight">
                  {room?.name || "Standard Room"}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                  <Hash className="w-3 h-3" />
                  <span>ID: {booking.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${currentStatusStyle}`}
              >
                {booking.status.replace("_", " ")}
              </span>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Dates */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Dates ({nights} Nights)
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {checkIn} — {checkOut}
                </p>
              </div>

              {/* Guest Breakdown */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Guests
                </p>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1" title="Adults">
                    {booking.adults || 1}{" "}
                    <Users className="w-3 h-3 text-slate-400" />
                  </span>
                  {booking.children > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span
                        className="flex items-center gap-1"
                        title="Children"
                      >
                        {booking.children}{" "}
                        <Baby className="w-3 h-3 text-slate-400" />
                      </span>
                    </>
                  )}
                  {booking.infants > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1" title="Infants">
                        {booking.infants}{" "}
                        <Milk className="w-3 h-3 text-blue-400" />
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex flex-wrap items-end justify-between mt-5 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Total Price
              </p>
              <p className="text-xl font-black text-[#0A1A44]">
                ₱{booking.total_amount?.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2 items-center">
              {showPayNow && (
                <Button
                  size="sm"
                  onClick={() => onPay(booking)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Pay Balance
                </Button>
              )}

              {hasPendingPayment && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl shadow-sm">
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
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:-translate-y-0.5"
                >
                  {({ loading }) =>
                    loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Receipt
                      </>
                    )
                  }
                </PDFDownloadLink>
              )}

              {canCancel && (
                <button
                  onClick={() => onCancel(booking.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}

              {canReview && (
                <Button
                  size="sm"
                  onClick={() => onReview(booking)}
                  className="bg-[#0A1A44] text-xs h-9 rounded-xl shadow-md"
                >
                  <Star className="w-3 h-3 mr-1" /> Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  // Modal States
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/bookings");
      const result = await res.json();

      if (res.ok && result.bookings) {
        setBookings(result.bookings);
      } else {
        console.error("Fetch error:", result.error);
      }

      const supabase = createClient();
      const { data: reviews } = await supabase
        .from("reviews")
        .select("booking_id")
        .eq("user_id", user.id);

      if (reviews) {
        const reviewedIds = new Set(
          reviews.map((r) => r.booking_id).filter(Boolean),
        );
        setReviewedBookingIds(reviewedIds as Set<string>);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const toastId = toast.loading("Cancelling booking...");
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      if (res.ok) {
        toast.dismiss(toastId);
        toast.success("Booking cancelled successfully.");
        fetchBookings();
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to cancel booking.");
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("An error occurred while cancelling.");
    }
  };

  const handlePayClick = (booking: Booking) => {
    setPaymentBooking(booking);
    setIsPaymentModalOpen(true);
  };

  return (
    <main className="min-h-screen flex flex-col font-sans">
      <Navbar activePage="home" logoVariant="text" />

      {reviewBooking && user && reviewBooking.room_types && (
        <ReviewModal
          bookingId={reviewBooking.id}
          roomId={reviewBooking.room_types.id}
          roomName={reviewBooking.room_types.name}
          userId={user.id}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => fetchBookings()}
        />
      )}

      {paymentBooking && (
        <UserPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          booking={{
            id: paymentBooking.id,
            total_amount: paymentBooking.total_amount,
          }}
          onSuccess={() => fetchBookings()}
        />
      )}

      <div className="relative grow flex flex-col pt-20 min-h-screen">
        <div className="absolute inset-0 bg-gray-900 z-0 fixed-bg">
          <div className="absolute inset-0 opacity-60 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 grow flex flex-col justify-center pb-20">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start py-12">
            {/* LEFT COLUMN: Welcome & Trips */}
            <div className="w-full space-y-10 order-2 lg:order-1">
              <WelcomeContent
                userName={
                  user?.user_metadata?.full_name?.split(" ")[0] || "User"
                }
              />

              <div className="space-y-6">
                <h2 className="text-2xl text-white font-serif font-bold border-b border-white/20 pb-2 flex items-center gap-2">
                  <CalendarDays className="w-6 h-6" /> Your Trips
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-20 text-white/60 animate-pulse bg-white/5 rounded-3xl border border-white/10">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading
                    your trips...
                  </div>
                ) : bookings.length > 0 ? (
                  <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {bookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onCancel={handleCancel}
                        onReview={(b) => setReviewBooking(b)}
                        onPay={(b) => handlePayClick(b)}
                        hasReviewed={reviewedBookingIds.has(booking.id)}
                        user={user}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 text-center flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-2">
                      <CalendarDays className="w-8 h-8 text-blue-200" />
                    </div>
                    <p className="text-blue-100 text-lg">
                      You haven&apos;t booked any trips yet.
                    </p>
                    <Link href="/accommodation">
                      <Button className="bg-white text-[#0A1A44] hover:bg-blue-50 font-bold mt-2">
                        Browse Available Rooms
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Calendar */}
            <div className="w-full flex justify-center lg:justify-end lg:sticky lg:top-24 order-1 lg:order-2 mb-8 lg:mb-0">
              <div className="transform transition-transform hover:scale-[1.02] duration-500">
                <AvailabilityCalendar />
              </div>
            </div>
          </div>
        </div>
        <HomeFooter showSignOut={true} />
      </div>
    </main>
  );
}
