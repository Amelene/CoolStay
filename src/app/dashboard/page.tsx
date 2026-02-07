// src/app/dashboard/page.tsx

"use client";

import Navbar from "@/components/Navbar";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import Link from "next/link";
import HomeFooter from "@/components/HomeFooter";
import { useEffect, useState, useCallback, useMemo } from "react"; // Added useMemo
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import ReviewModal from "@/components/ReviewModal";
import UserPaymentModal from "@/components/UserPaymentModal";
import BookingHistoryModal from "@/components/BookingHistoryModal"; // NEW IMPORT
import BookingCard, { Booking } from "@/components/BookingCard"; // NEW IMPORT, REMOVE LOCAL BookingCard
import { toast } from "sonner";
import {
  Loader2,
  CalendarDays,
  AlertTriangle,
  History, // Added Icon
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- REMOVE: Local interface definitions for RoomType, Payment, Booking ---
// (We now import them from components/BookingCard)

// --- REMOVE: Local BookingCard component ---
// (It is now in components/BookingCard.tsx)

// ... Keep CancelBookingModal as is ...
interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const CancelBookingModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancelModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 scale-100 animate-in zoom-in-95">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#0A1A44] mb-2 font-serif">
            Cancel Reservation?
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Are you sure you want to cancel this trip? This action cannot be
            undone and may be subject to cancellation fees.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-slate-600 hover:bg-slate-50 rounded-xl"
              disabled={isLoading}
            >
              Keep Trip
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Yes, Cancel"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... Keep WelcomeContent as is ...
const WelcomeContent = ({ userName }: { userName: string }) => {
  return (
    <div className="text-white space-y-6 text-center lg:text-left animate-in fade-in slide-in-from-left-10 duration-700">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight drop-shadow-lg font-serif">
        Welcome back, <br /> {userName}!
      </h1>
      <p className="text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx0 drop-shadow-md font-medium">
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

export default function DashboardPage() {
  const router = useRouter();
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

  // NEW: History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Cancel Modal States
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ... useEffect for getUser and fetchBookings (Keep exactly as is) ...
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
    try {
      const res = await fetch("/api/bookings");
      if (res.status === 401 || res.status === 403) {
        router.push("/login?return_to=/dashboard");
        return;
      }
      const result = await res.json();
      if (res.ok && result.bookings) {
        setBookings(result.bookings);
      } else {
        console.error("Fetch error:", result.error);
      }
      if (user) {
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
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ... Helper functions (handleCancelClick, handleConfirmCancel, handlePayClick) ...
  const handleCancelClick = (bookingId: string) => {
    setCancelBookingId(bookingId);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelBookingId) return;
    setIsCancelling(true);
    const toastId = toast.loading("Cancelling booking...");
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: cancelBookingId }),
      });
      if (res.ok) {
        toast.dismiss(toastId);
        toast.success("Booking cancelled successfully.");
        await fetchBookings();
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to cancel booking.");
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("An error occurred while cancelling.");
    } finally {
      setIsCancelling(false);
      setIsCancelModalOpen(false);
      setCancelBookingId(null);
    }
  };

  const handlePayClick = (booking: Booking) => {
    setPaymentBooking(booking);
    setIsPaymentModalOpen(true);
  };

  // --- NEW LOGIC: Filter for Most Recent Trip ---
  const mostRecentBooking = useMemo(() => {
    if (bookings.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Prioritize Upcoming trips (check-in >= today) sorted ascending (soonest first)
    const upcoming = bookings
      .filter(
        (b) => new Date(b.check_in_date) >= today && b.status !== "cancelled",
      )
      .sort(
        (a, b) =>
          new Date(a.check_in_date).getTime() -
          new Date(b.check_in_date).getTime(),
      );

    if (upcoming.length > 0) return upcoming[0];

    // 2. Fallback to latest past trip sorted descending
    return [...bookings].sort(
      (a, b) =>
        new Date(b.check_in_date).getTime() -
        new Date(a.check_in_date).getTime(),
    )[0];
  }, [bookings]);

  return (
    <main className="min-h-screen flex flex-col font-sans">
      <Navbar activePage="home" logoVariant="text" />

      {/* --- MODALS --- */}
      {/* ADD: Booking History Modal */}
      <BookingHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        bookings={bookings}
        onCancelClick={handleCancelClick}
        onReview={(b) => setReviewBooking(b)}
        onPay={(b) => handlePayClick(b)}
        reviewedBookingIds={reviewedBookingIds}
        user={user}
      />

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

      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelBookingId(null);
        }}
        onConfirm={handleConfirmCancel}
        isLoading={isCancelling}
      />

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
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <h2 className="text-2xl text-white font-serif font-bold flex items-center gap-2">
                    <CalendarDays className="w-6 h-6" /> Your Next Trip
                  </h2>
                  {/* NEW VIEW ALL BUTTON */}
                  {bookings.length > 0 && (
                    <button
                      onClick={() => setIsHistoryOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white uppercase tracking-wider transition-colors"
                    >
                      <History className="w-4 h-4" /> View History
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20 text-white/60 animate-pulse bg-white/5 rounded-3xl border border-white/10">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading
                    your trips...
                  </div>
                ) : mostRecentBooking ? (
                  <div className="space-y-5 pr-2 p-1">
                    {/* ONLY SHOW MOST RECENT */}
                    <BookingCard
                      key={mostRecentBooking.id}
                      booking={mostRecentBooking}
                      onCancelClick={handleCancelClick}
                      onReview={(b) => setReviewBooking(b)}
                      onPay={(b) => handlePayClick(b)}
                      hasReviewed={reviewedBookingIds.has(mostRecentBooking.id)}
                      user={user}
                    />
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
