"use client";

import BookRoomModal from "@/components/BookRoomModal";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RoomCard, { BookingData } from "@/components/Roomcard";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  capacity: number;
  avg_rating?: number;
  review_count?: number;
  available_count?: number; // 🔒 NEW: Tracks exactly how many are left
}

interface RawRoomData extends Omit<
  RoomType,
  "avg_rating" | "review_count" | "available_count"
> {
  reviews?: { rating: number }[];
}

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

  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [showGuestMenu, setShowGuestMenu] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);
  const guestMenuRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const [selectedRoom, setSelectedRoom] = useState<BookingData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      setLoading(true);
      try {
        await fetchRooms();
        const returnCheckIn = searchParams.get("check_in");
        const returnCheckOut = searchParams.get("check_out");
        const returnRoomId = searchParams.get("room_id");

        if (returnCheckIn) {
          setCheckInDate(returnCheckIn);
          setViewDate(new Date(returnCheckIn));
        }
        if (returnCheckOut) setCheckOutDate(returnCheckOut);

        if (returnRoomId) {
          const supabase = createClient();
          const { data } = await supabase
            .from("room_types")
            .select("*")
            .eq("is_active", true)
            .eq("id", returnRoomId)
            .single();
          if (data) {
            setSelectedRoom({
              id: data.id,
              name: data.name,
              base_price: data.base_price,
              price_day: data.price_day,
              price_night: data.price_night,
              price_overnight: data.price_overnight,
              capacity: data.capacity,
            });
            router.replace("/accommodation", { scroll: false });
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      )
        setShowCalendar(false);
      if (
        guestMenuRef.current &&
        !guestMenuRef.current.contains(event.target as Node)
      )
        setShowGuestMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRooms = async () => {
    const supabase = createClient();

    const [{ data, error }, { data: unavailableInventory }] = await Promise.all([
      supabase.from("room_types").select("*, reviews(rating)").eq("is_active", true),
      supabase.from("room_inventory").select("room_type_id").in("status", ["cleaning", "out_of_order"]),
    ]);

    if (error) {
      toast.error("Failed to load rooms");
    } else {
      // Build offline-room map
      const unavailableMap: Record<string, number> = {};
      unavailableInventory?.forEach((r) => {
        if (r.room_type_id)
          unavailableMap[r.room_type_id] = (unavailableMap[r.room_type_id] || 0) + 1;
      });

      const roomsWithData = ((data as RawRoomData[]) || []).map((room) => {
        const ratings = room.reviews?.map((r) => r.rating) || [];
        const count = ratings.length;
        const avg =
          count > 0
            ? ratings.reduce((a: number, b: number) => a + b, 0) / count
            : 0;
        // Deduct rooms that are offline (cleaning / out_of_order)
        const offline = unavailableMap[room.id] || 0;
        return {
          ...room,
          avg_rating: avg,
          review_count: count,
          available_count: Math.max(0, room.total_rooms - offline),
        };
      });
      setRooms(roomsWithData);
    }
  };

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
                className={`h-8 w-8 text-xs rounded-full flex items-center justify-center transition-all ${bgClass}`}
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
    const totalGuests = adults + children;

    try {
      const { data: allRooms, error: roomsError } = await supabase
        .from("room_types")
        .select("*, reviews(rating)")
        .eq("is_active", true)
        .gte("capacity", totalGuests);
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
        .gte("check_out_date", searchStart);
      if (bookingsError) throw bookingsError;

      // 🔒 FIX: Also count rooms physically unavailable (cleaning / out_of_order).
      // These have no active booking so peakBooked misses them.
      const { data: unavailableInventory } = await supabase
        .from("room_inventory")
        .select("room_type_id")
        .in("status", ["cleaning", "out_of_order"]);

      // Build a map: room_type_id → count of unavailable physical rooms
      const unavailableMap: Record<string, number> = {};
      unavailableInventory?.forEach((r) => {
        if (r.room_type_id)
          unavailableMap[r.room_type_id] =
            (unavailableMap[r.room_type_id] || 0) + 1;
      });

      const concurrencyMap: Record<string, Record<string, number>> = {};

      busyBookings?.forEach((booking) => {
        const roomId = booking.room_type_id;
        if (!concurrencyMap[roomId]) concurrencyMap[roomId] = {};

        const bStart = booking.check_in_date;
        const bEnd =
          booking.check_in_date === booking.check_out_date
            ? new Date(new Date(booking.check_in_date).getTime() + 86400000)
              .toISOString()
              .split("T")[0]
            : booking.check_out_date;

        const overlapStart = new Date(
          Math.max(new Date(bStart).getTime(), new Date(searchStart).getTime()),
        );
        const overlapEnd = new Date(
          Math.min(new Date(bEnd).getTime(), new Date(searchEnd).getTime()),
        );

        const current = new Date(overlapStart);
        while (current < overlapEnd) {
          const dateStr = current.toISOString().split("T")[0];
          concurrencyMap[roomId][dateStr] =
            (concurrencyMap[roomId][dateStr] || 0) + 1;
          current.setDate(current.getDate() + 1);
        }
      });

      // 🔒 THE MATH: Map and filter rooms based on remaining capacity
      const availableRooms = (allRooms as RawRoomData[])
        .map((room) => {
          const roomCounts = concurrencyMap[room.id] || {};
          let peakBooked = 0;

          for (const count of Object.values(roomCounts)) {
            if (count > peakBooked) peakBooked = count as number;
          }

          // Subtract booked AND physically offline rooms (cleaning / out_of_order)
          const unavailableCount = unavailableMap[room.id] || 0;
          const availableCount = room.total_rooms - peakBooked - unavailableCount;

          const ratings = room.reviews?.map((r) => r.rating) || [];
          const count = ratings.length;
          const avg =
            count > 0
              ? ratings.reduce((a: number, b: number) => a + b, 0) / count
              : 0;

          return {
            ...room,
            avg_rating: avg,
            review_count: count,
            available_count: availableCount,
          };
        })
        .filter((room) => room.available_count && room.available_count > 0); // Drop any room with 0 availability

      setRooms(availableRooms as RoomType[]);
      if (availableRooms.length === 0)
        toast.info("No rooms available for this group size/date.");
      else toast.success(`Found ${availableRooms.length} available rooms!`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while searching.");
    } finally {
      setSearching(false);
    }
  };

  const guestText = [
    adults > 0 ? `${adults} Adult${adults > 1 ? "s" : ""}` : null,
    children > 0 ? `${children} Child${children > 1 ? "ren" : ""}` : null,
    infants > 0 ? `${infants} Infant${infants > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#D6EAF8]">
      <Navbar activePage="accommodation" logoVariant="text" />

      {selectedRoom && (
        <BookRoomModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          initialCheckIn={checkInDate}
          initialCheckOut={checkOutDate}
          initialAdults={adults}
          initialChildren={children}
          initialInfants={infants}
        />
      )}

      <div className="pt-28 pb-20 px-4 sm:px-8 max-w-360 mx-auto">
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
            <div
              className="md:col-span-5 flex flex-col gap-2 relative z-20"
              ref={calendarRef}
            >
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider opacity-90">
                <span>Check In & Out</span>
              </div>
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
              {showCalendar && (
                <div className="absolute top-full left-0 mt-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col md:flex-row gap-4 animate-in zoom-in-95 origin-top-left w-full md:w-auto">
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
                  <div className="flex gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {renderMonth(0)}
                    <div className="hidden md:block w-px bg-slate-100"></div>
                    <div className="hidden md:block">{renderMonth(1)}</div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="md:col-span-4 flex flex-col gap-2 relative"
              ref={guestMenuRef}
            >
              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                Guests
              </span>
              <div
                onClick={() => setShowGuestMenu(!showGuestMenu)}
                className={`bg-white text-gray-700 rounded-xl h-14 flex items-center px-4 shadow-inner relative hover:ring-2 ring-[#0A1A44]/20 transition-all cursor-pointer ${showGuestMenu ? "ring-2 ring-[#0A1A44]" : ""}`}
              >
                <Users className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <div className="flex-1 flex flex-col justify-center overflow-hidden">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    Total
                  </span>
                  <span
                    className="text-sm font-bold text-[#0A1A44] truncate"
                    title={guestText}
                  >
                    {guestText}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ${showGuestMenu ? "rotate-180" : ""}`}
                />
              </div>

              {showGuestMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in zoom-in-95 origin-top min-w-70">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Adults</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Ages 13+
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={adults === 0 ? "" : adults}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setAdults(isNaN(val) ? 0 : val);
                        }}
                        onBlur={() => {
                          if (adults < 1) setAdults(1);
                        }}
                        className="w-10 text-center font-bold text-[#0A1A44] outline-none bg-transparent appearance-none [&::-webkit-inner-spin-button]:appearance-none m-0"
                      />
                      <button
                        onClick={() => setAdults(adults + 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 w-full mb-4"></div>

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        Children
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Ages 3-12
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={children === 0 ? "" : children}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setChildren(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        onBlur={() => {
                          if (children < 0 || isNaN(children)) setChildren(0);
                        }}
                        className="w-10 text-center font-bold text-[#0A1A44] outline-none bg-transparent appearance-none [&::-webkit-inner-spin-button]:appearance-none m-0 placeholder:text-[#0A1A44]"
                      />
                      <button
                        onClick={() => setChildren(children + 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 w-full mb-4"></div>

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        Infants
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Ages 0-2 Yrs (Free)
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={infants === 0 ? "" : infants}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setInfants(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        onBlur={() => {
                          if (infants < 0 || isNaN(infants)) setInfants(0);
                        }}
                        className="w-10 text-center font-bold text-[#0A1A44] outline-none bg-transparent appearance-none [&::-webkit-inner-spin-button]:appearance-none m-0 placeholder:text-[#0A1A44]"
                      />
                      <button
                        onClick={() => setInfants(infants + 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
              <p className="text-[#0A1A44]/60 mt-2">
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
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 px-2">
                <h2 className="text-2xl font-serif font-bold text-[#0A1A44] shrink-0">
                  {checkInDate && checkOutDate
                    ? "Available Rooms"
                    : "All Accommodations"}
                </h2>
                <div className="w-full lg:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by room name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-10 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#0A1A44] focus:ring-2 focus:ring-[#0A1A44]/20 transition-all shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-2">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${categoryFilter === "all" ? "bg-[#0A1A44] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCategoryFilter("room")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${categoryFilter === "room" ? "bg-[#0A1A44] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                  >
                    Rooms
                  </button>
                  <button
                    onClick={() => setCategoryFilter("cottage")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${categoryFilter === "cottage" ? "bg-[#0A1A44] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                  >
                    Cottages
                  </button>
                  <button
                    onClick={() => setCategoryFilter("event")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${categoryFilter === "event" ? "bg-[#0A1A44] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
                  >
                    Events
                  </button>
                </div>
                <span className="text-sm font-bold text-[#0077B6] bg-white px-3 py-1 rounded-full shadow-sm shrink-0">
                  {
                    rooms.filter((room) => {
                      let matchesCategory = true;
                      if (categoryFilter === "room")
                        matchesCategory = room.id.startsWith("rm_");
                      else if (categoryFilter === "cottage")
                        matchesCategory = room.id.startsWith("cot_");
                      else if (categoryFilter === "event")
                        matchesCategory = room.id.startsWith("evt_");
                      const matchesSearch =
                        searchQuery === "" ||
                        room.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        room.description
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase());
                      return matchesCategory && matchesSearch;
                    }).length
                  }{" "}
                  Results
                </span>
              </div>

              {rooms
                .filter((room) => {
                  let matchesCategory = true;
                  if (categoryFilter === "room")
                    matchesCategory = room.id.startsWith("rm_");
                  else if (categoryFilter === "cottage")
                    matchesCategory = room.id.startsWith("cot_");
                  else if (categoryFilter === "event")
                    matchesCategory = room.id.startsWith("evt_");
                  const matchesSearch =
                    searchQuery === "" ||
                    room.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    room.description
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase());
                  return matchesCategory && matchesSearch;
                })
                .map((room) => (
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
                    availableCount={room.available_count} // 🔒 NEW: Passed down to the Card
                    onBook={(roomData) => {
                      if (!currentUser) {
                        router.push(
                          `/login?return_to=${encodeURIComponent("/accommodation")}`,
                        );
                        return;
                      }
                      setSelectedRoom(roomData);
                    }}
                    capacity={room.capacity}
                    rating={room.avg_rating}
                    reviewCount={room.review_count}
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
