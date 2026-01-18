"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import RoomCard, { BookingData } from "@/components/Roomcard";
import BookRoomModal from "@/components/BookRoomModal";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, Suspense, useRef } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

// --- TYPES ---
interface RoomType {
  id: string;
  name: string;
  description: string;
  image_url: string;
  amenities: string[];
  base_price: number;
  total_rooms: number;
  price_day?: number;
  price_night?: number;
  price_overnight?: number;
}

// --- HELPERS ---
const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

function AccommodationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Search State
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState<number | string>(2);

  // Calendar UI State
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Selected room for Modal
  const [selectedRoom, setSelectedRoom] = useState<BookingData | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await fetchRooms();

        const returnCheckIn = searchParams.get("check_in");
        const returnCheckOut = searchParams.get("check_out");
        const returnGuests = searchParams.get("guests");
        const returnRoomId = searchParams.get("room_id");

        if (returnCheckIn) {
          setCheckInDate(returnCheckIn);
          setViewDate(new Date(returnCheckIn));
        }
        if (returnCheckOut) setCheckOutDate(returnCheckOut);
        if (returnGuests) setGuestCount(parseInt(returnGuests));

        if (returnRoomId) {
          const supabase = createClient();
          const { data } = await supabase
            .from("room_types")
            .select("*")
            .eq("is_active", true);

          if (data) {
            const roomToOpen = (data as RoomType[]).find(
              (r) => r.id === returnRoomId,
            );
            if (roomToOpen) {
              setSelectedRoom({
                id: roomToOpen.id,
                name: roomToOpen.name,
                base_price: roomToOpen.base_price,
                price_day: roomToOpen.price_day,
                price_night: roomToOpen.price_night,
                price_overnight: roomToOpen.price_overnight,
              });
              router.replace("/accommodation", { scroll: false });
            }
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRooms = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("room_types")
      .select("*")
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to load rooms");
    } else {
      setRooms(data as RoomType[]);
    }
  };

  // --- CALENDAR LOGIC ---
  const handleDateClick = (dateStr: string) => {
    if (
      !checkInDate ||
      (checkInDate && checkOutDate && checkInDate !== checkOutDate)
    ) {
      setCheckInDate(dateStr);
      setCheckOutDate("");
    } else if (checkInDate && !checkOutDate) {
      if (dateStr < checkInDate) {
        setCheckInDate(dateStr);
      } else {
        setCheckOutDate(dateStr);
        setShowCalendar(false);
      }
    } else if (checkInDate && checkOutDate && checkInDate === checkOutDate) {
      setCheckInDate(dateStr);
      setCheckOutDate("");
    }
  };

  const renderMonth = (offset: number) => {
    const targetDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + offset,
      1,
    );
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptySlots = Array.from({ length: firstDay }, (_, i) => i);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <div className="w-64 p-2">
        <div className="text-center font-bold text-[#0A1A44] mb-2 font-serif">
          {monthNames[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 font-bold mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptySlots.map((i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const todayStr = new Date().toISOString().split("T")[0];
            const isPast = dateStr < todayStr;

            const isSelected =
              dateStr === checkInDate || dateStr === checkOutDate;
            const isInRange =
              checkInDate &&
              checkOutDate &&
              dateStr > checkInDate &&
              dateStr < checkOutDate;
            const isHoverRange =
              !checkOutDate &&
              checkInDate &&
              hoverDate &&
              dateStr > checkInDate &&
              dateStr <= hoverDate;

            let bgClass = "hover:bg-blue-50 text-gray-700";
            if (isPast) bgClass = "text-gray-300 cursor-not-allowed";
            else if (isSelected) bgClass = "bg-[#0A1A44] text-white shadow-md";
            else if (isInRange) bgClass = "bg-blue-100 text-[#0A1A44]";
            else if (isHoverRange)
              bgClass =
                "bg-blue-50 text-[#0A1A44] border border-blue-200 dashed";

            return (
              <button
                key={day}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                className={`
                  h-8 w-8 text-xs rounded-full flex items-center justify-center transition-all
                  ${bgClass}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSearch = async () => {
    if (!checkInDate || !checkOutDate) {
      toast.error("Please select both check-in and check-out dates");
      return;
    }

    if (new Date(checkInDate) > new Date(checkOutDate)) {
      toast.error("Check-out date cannot be before check-in date");
      return;
    }

    setSearching(true);
    const supabase = createClient();
    const validGuestCount = Number(guestCount) || 1;

    try {
      const { data: allRooms, error: roomsError } = await supabase
        .from("room_types")
        .select("*")
        .eq("is_active", true)
        .gte("capacity", validGuestCount);

      if (roomsError) throw roomsError;

      const searchStart = checkInDate;
      const searchEnd =
        checkOutDate === checkInDate
          ? new Date(new Date(checkOutDate).getTime() + 86400000)
              .toISOString()
              .split("T")[0]
          : checkOutDate;

      const { data: busyBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("room_type_id, check_in_date, check_out_date")
        .neq("status", "cancelled")
        .lt("check_in_date", searchEnd)
        .gt("check_out_date", searchStart);

      if (bookingsError) throw bookingsError;

      const bookingCounts: Record<string, number> = {};

      busyBookings?.forEach((booking) => {
        const bStart = booking.check_in_date;
        const bEnd =
          booking.check_in_date === booking.check_out_date
            ? new Date(new Date(booking.check_in_date).getTime() + 86400000)
                .toISOString()
                .split("T")[0]
            : booking.check_out_date;

        if (bStart < searchEnd && bEnd > searchStart) {
          bookingCounts[booking.room_type_id] =
            (bookingCounts[booking.room_type_id] || 0) + 1;
        }
      });

      const availableRooms = (allRooms as RoomType[]).filter((room) => {
        const bookedCount = bookingCounts[room.id] || 0;
        return room.total_rooms > bookedCount;
      });

      setRooms(availableRooms);

      if (availableRooms.length === 0) {
        toast.info("No rooms available for these dates.");
      } else {
        toast.success(`Found ${availableRooms.length} available rooms!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while searching.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#D6EAF8]">
      <Navbar activePage="accommodation" logoVariant="text" />

      {selectedRoom && (
        <BookRoomModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          initialCheckIn={checkInDate}
          initialCheckOut={checkOutDate}
          initialGuests={Number(guestCount) || 2}
        />
      )}

      <div className="pt-28 pb-20 px-4 sm:px-8 max-w-[1440px] mx-auto">
        {/* --- SEARCH BAR SECTION --- */}
        <div className="relative bg-[#0077B6] rounded-3xl p-6 md:p-8 shadow-xl text-white mb-12 mt-8 animate-in slide-in-from-top-10 duration-700">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden z-10">
            <Image
              src="/images/logo/coolstaylogo.jpg"
              alt="CoolStay logo"
              fill
              priority
              className="object-cover"
            />
          </div>

          <div className="pt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            {/* DATE PICKER TRIGGER */}
            {/* Changed from space-y-2 to flex flex-col gap-2 for stability */}
            <div
              className="md:col-span-5 flex flex-col gap-2 relative z-20"
              ref={calendarRef}
            >
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider opacity-90">
                <span>Check In & Out</span>
              </div>

              {/* TRIGGER BOX */}
              <div
                onClick={() => setShowCalendar(!showCalendar)}
                className={`bg-white text-gray-700 rounded-xl flex items-center h-14 px-2 shadow-inner overflow-hidden cursor-pointer transition-all ${showCalendar ? "ring-2 ring-[#0A1A44]" : "hover:ring-2 ring-[#0A1A44]/20"}`}
              >
                <div className="flex-1 px-4 border-r border-gray-100 flex flex-col justify-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    From
                  </span>
                  <span
                    className={`text-sm font-bold truncate ${checkInDate ? "text-[#0A1A44]" : "text-gray-300"}`}
                  >
                    {checkInDate
                      ? new Date(checkInDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Select Date"}
                  </span>
                </div>
                <div className="flex-1 px-4 flex flex-col justify-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    To
                  </span>
                  <span
                    className={`text-sm font-bold truncate ${checkOutDate ? "text-[#0A1A44]" : "text-gray-300"}`}
                  >
                    {checkOutDate
                      ? new Date(checkOutDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Select Date"}
                  </span>
                </div>
                <CalendarIcon className="w-5 h-5 text-gray-400 mr-2" />
              </div>

              {/* CALENDAR POPOVER */}
              {showCalendar && (
                <div className="absolute top-full left-0 mt-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col md:flex-row gap-4 animate-in zoom-in-95 origin-top-left w-full md:w-auto">
                  {/* Controls */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={() =>
                        setViewDate(
                          new Date(viewDate.setMonth(viewDate.getMonth() - 1)),
                        )
                      }
                      className="pointer-events-auto p-1 hover:bg-slate-100 rounded-full text-slate-600"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setViewDate(
                          new Date(viewDate.setMonth(viewDate.getMonth() + 1)),
                        )
                      }
                      className="pointer-events-auto p-1 hover:bg-slate-100 rounded-full text-slate-600"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Dual Grid */}
                  <div className="flex gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {renderMonth(0)}
                    <div className="hidden md:block w-px bg-slate-100"></div>
                    <div className="hidden md:block">{renderMonth(1)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* GUESTS INPUT */}
            <div className="md:col-span-4 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                Guests
              </span>
              <div className="bg-white text-gray-700 rounded-xl h-14 flex items-center px-4 shadow-inner relative hover:ring-2 ring-[#0A1A44]/20 transition-all">
                <Users className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full outline-none font-bold text-[#0A1A44] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={guestCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setGuestCount("");
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) setGuestCount(num);
                    }
                  }}
                />
                <span className="absolute right-4 text-xs font-bold text-gray-400 pointer-events-none">
                  PAX
                </span>
              </div>
            </div>

            {/* SEARCH BUTTON */}
            <div className="md:col-span-3">
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="w-full h-14 bg-[#0A1A44] hover:bg-[#0A1A44]/90 rounded-xl shadow-lg text-lg font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-95"
              >
                {searching ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" /> Check Availability
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#0A1A44] mx-auto mb-4" />
              <p className="text-[#0A1A44]/60 font-medium">
                Finding the perfect room for you...
              </p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-[#0077B6]/30">
              <p className="text-xl text-[#0A1A44] font-bold">No rooms found</p>
              <p className="text--[#0A1A44]/60 mt-2">
                Try changing your dates or guest count.
              </p>
              <Button
                onClick={fetchRooms}
                variant="outline"
                className="mt-4 border-[#0A1A44] text-[#0A1A44] hover:bg-[#0A1A44] hover:text-white"
              >
                View All Rooms
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-6 px-2">
                <h2 className="text-2xl font-serif font-bold text-[#0A1A44]">
                  {checkInDate && checkOutDate
                    ? "Available Rooms"
                    : "All Accommodations"}
                </h2>
                <span className="text-sm font-bold text-[#0077B6] bg-white px-3 py-1 rounded-full shadow-sm">
                  {rooms.length} Results
                </span>
              </div>
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  id={room.id}
                  title={room.name}
                  description={room.description}
                  imageSrc={
                    room.image_url || "/images/background/coolstaybg.png"
                  }
                  size={room.amenities?.[0] || "Standard"}
                  features={room.amenities || []}
                  price={room.base_price}
                  priceDay={room.price_day}
                  priceNight={room.price_night}
                  priceOvernight={room.price_overnight}
                  onBook={(roomData) => setSelectedRoom(roomData)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function AccommodationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#D6EAF8] pt-28 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#0A1A44]" />
        </div>
      }
    >
      <AccommodationContent />
    </Suspense>
  );
}
