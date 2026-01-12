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
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BookingReceipt from "@/components/pdf/BookingReceipt";

interface RoomType {
  id: string;
  name: string;
  image_url: string;
}

// Payment Interface for Receipt
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
  guests_count: number;
  room_types: RoomType | null;
  payments?: Payment[];
}

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
            className="bg-[#0A1A44] hover:bg-[#0A1A44]/90 px-10 border border-white/20 shadow-lg"
          >
            BOOK ANOTHER STAY
          </Button>
        </Link>
      </div>
    </div>
  );
};

// ... (Keep BookingCard component exactly as is) ...
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
  });
  const checkOut = new Date(booking.check_out_date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );

  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";
  const canReview =
    (booking.status === "checked_out" || booking.status === "completed") &&
    !hasReviewed;

  const hasPendingPayment = booking.payments?.some(
    (p) => p.status === "pending"
  );

  const validPayments =
    booking.payments?.filter((p) => p.status === "completed") || [];
  const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);

  const isFullyPaid = totalPaid >= booking.total_amount;
  const showDownload = totalPaid > 0;

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

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 flex flex-col md:flex-row gap-4 shadow-xl border border-white/50 transition-transform hover:scale-[1.02]">
      <div className="w-full md:w-32 h-32 relative rounded-xl overflow-hidden shrink-0">
        <Image
          src={room?.image_url || "/images/background/coolstaybg.png"}
          alt={room?.name || "Room"}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-[#0A1A44] font-bold font-serif text-xl">
          {room?.name || "Standard Room"}
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          Booking ID: {booking.id.slice(0, 8)}...
        </p>

        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-900 px-3 py-1.5 rounded-lg text-xs font-bold w-fit mt-1">
          <span>👥 {booking.guests_count} Pax</span>
          <span className="text-blue-300">|</span>
          <span>
            {checkIn} — {checkOut}
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-between items-end">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            booking.status === "confirmed"
              ? "bg-green-100 text-green-700"
              : booking.status === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : booking.status === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {booking.status.replace("_", " ")}
        </span>

        <div className="text-right mt-2 space-y-2 flex flex-col items-end">
          <p className="text-xl font-bold text-[#0A1A44]">
            ₱{booking.total_amount?.toLocaleString()}
          </p>

          <div className="flex gap-2 items-center flex-wrap justify-end">
            {showPayNow && (
              <Button
                size="sm"
                onClick={() => onPay(booking)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 flex items-center gap-1 shadow-md transition-all active:scale-95"
              >
                <CreditCard className="w-3 h-3" /> Pay Now
              </Button>
            )}

            {hasPendingPayment && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg shadow-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Verifying...
                </span>
              </div>
            )}

            {showDownload && (
              <PDFDownloadLink
                document={
                  <BookingReceipt
                    booking={receiptData}
                    payments={validPayments}
                  />
                }
                fileName={`Receipt_${booking.id.substring(0, 8)}.pdf`}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-8 px-3 rounded-md flex items-center gap-1 shadow-md transition-all active:scale-95 font-medium"
              >
                {({ loading }) =>
                  loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-3 h-3" /> Receipt
                    </>
                  )
                }
              </PDFDownloadLink>
            )}
          </div>

          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              className="text-xs text-red-500 hover:text-red-700 underline font-semibold mt-1"
            >
              Cancel Booking
            </button>
          )}

          {canReview && (
            <Button
              size="sm"
              onClick={() => onReview(booking)}
              className="bg-[#0A1A44] text-xs h-8 flex items-center gap-1"
            >
              <Star className="w-3 h-3" /> Write Review
            </Button>
          )}

          {hasReviewed &&
            (booking.status === "checked_out" ||
              booking.status === "completed") && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Review Submitted
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(
    new Set()
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
      const supabase = createClient();

      const { data } = await supabase
        .from("bookings")
        .select(
          `
            *,
            room_types (id, name, image_url),
            payments (*)
        `
        )
        .eq("guest_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setBookings(data as Booking[]);
      }

      const { data: reviews } = await supabase
        .from("reviews")
        .select("booking_id")
        .eq("user_id", user.id);

      if (reviews) {
        const reviewedIds = new Set(
          reviews.map((r) => r.booking_id).filter(Boolean)
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

      {/* Review Modal */}
      {reviewBooking && user && reviewBooking.room_types && (
        <ReviewModal
          bookingId={reviewBooking.id}
          roomId={reviewBooking.room_types.id}
          roomName={reviewBooking.room_types.name}
          userId={user.id}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}

      {/* Payment Modal */}
      {paymentBooking && (
        <UserPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          booking={{
            id: paymentBooking.id,
            total_amount: paymentBooking.total_amount,
          }}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}

      <div className="relative grow flex flex-col pt-20 min-h-screen">
        <div className="absolute inset-0 bg-gray-900 z-0 fixed-bg">
          <div className="absolute inset-0 opacity-60 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 grow flex flex-col justify-center pb-20">
          {/* ✅ FIX: Changed to flex-col for mobile (vertical stack) and grid for desktop. */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start py-12">
            {/* Left Column: Welcome & Bookings */}
            <div className="w-full space-y-10 order-2 lg:order-1">
              <WelcomeContent
                userName={
                  user?.user_metadata?.full_name?.split(" ")[0] || "User"
                }
              />

              <div className="space-y-4">
                <h2 className="text-2xl text-white font-serif font-bold border-b border-white/20 pb-2 mb-4">
                  Your Trips
                </h2>
                {loading ? (
                  <div className="text-white/60 animate-pulse">
                    Loading your trips...
                  </div>
                ) : bookings.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center">
                    <p className="text-blue-100 mb-2">
                      You haven&apos;t booked any trips yet.
                    </p>
                    <Link
                      href="/accommodation"
                      className="text-white font-bold underline hover:text-blue-200"
                    >
                      Browse Rooms
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full flex justify-center lg:justify-end lg:sticky lg:top-24 order-1 lg:order-2 mb-8 lg:mb-0">
              <AvailabilityCalendar />
            </div>
          </div>
        </div>
        <HomeFooter showSignOut={true} />
      </div>
    </main>
  );
}
