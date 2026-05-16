"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

interface RoomInventory {
  id: string;
  room_number: string;
  room_type_id: string;
  type_name: string;
}

interface ApiRoomResponse {
  id: string;
  room_number: string;
  room_type_id: string;
}

interface ApiBookingResponse {
  id: string;
  guest_id: string;
  users?: { full_name: string };
  room_type_id: string;
  assigned_room_id: string | null;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

interface Booking {
  id: string;
  guest_name: string;
  room_type_id: string;
  assigned_room_id: string | null;
  checkIn: string;
  checkOut: string;
  checkOutDisplay: string;
  status: string;
}

const DAY_COUNT = 14;
const CELL_WIDTH = 112;

const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseYMD = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
};

const diffDays = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000);

const normalizeCheckout = (checkIn: string, checkOut: string) => {
  if (!checkIn) return checkOut;
  if (!checkOut || checkOut <= checkIn) return formatYMD(addDays(parseYMD(checkIn), 1));
  return checkOut;
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200",
  confirmed: "bg-blue-100 text-blue-950 border-blue-300 hover:bg-blue-200",
  checked_in:
    "bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200",
};

function bookingHref(booking: Booking) {
  return `/admin/bookings?booking=${encodeURIComponent(booking.id)}`;
}

function getBookingMetrics(booking: Booking, startDate: Date) {
  const checkInDate = parseYMD(booking.checkIn);
  const checkOutDate = parseYMD(booking.checkOutDisplay);
  const windowEnd = addDays(startDate, DAY_COUNT);
  const visibleStart = checkInDate < startDate ? startDate : checkInDate;
  const visibleEnd = checkOutDate > windowEnd ? windowEnd : checkOutDate;
  const leftDays = Math.max(0, diffDays(startDate, visibleStart));
  const spanDays = Math.max(1, diffDays(visibleStart, visibleEnd));

  return {
    left: leftDays * CELL_WIDTH,
    width: spanDays * CELL_WIDTH - 10,
    startsBeforeWindow: checkInDate < startDate,
    endsAfterWindow: checkOutDate > windowEnd,
  };
}

function BookingBar({
  booking,
  startDate,
  compact = false,
}: {
  booking: Booking;
  startDate: Date;
  compact?: boolean;
}) {
  const metrics = getBookingMetrics(booking, startDate);
  const color =
    statusStyles[booking.status] ||
    "bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200";
  const label = compact ? booking.guest_name.split(" ")[0] : booking.guest_name;

  return (
    <Link
      href={bookingHref(booking)}
      title={`${booking.guest_name} - ${booking.checkIn} to ${booking.checkOut}`}
      className={`absolute top-2 h-8 rounded-lg border px-2 text-[11px] font-black shadow-sm transition-colors flex items-center overflow-hidden ${color}`}
      style={{ left: metrics.left + 5, width: metrics.width }}
    >
      {metrics.startsBeforeWindow && <span className="mr-1">&lt;</span>}
      <span className="truncate">{label}</span>
      {metrics.endsAfterWindow && <span className="ml-auto">&gt;</span>}
    </Link>
  );
}

function TimelineCells({ days, todayStr }: { days: Date[]; todayStr: string }) {
  return (
    <div className="flex h-full">
      {days.map((day) => {
        const dayStr = formatYMD(day);
        return (
          <div
            key={dayStr}
            className={`w-28 shrink-0 border-r border-slate-100 ${
              dayStr === todayStr ? "bg-blue-50/60" : ""
            }`}
          />
        );
      })}
    </div>
  );
}

export default function BookingTimeline() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [groupedRooms, setGroupedRooms] = useState<
    Record<string, RoomInventory[]>
  >({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");

  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const [inventoryRes, typesRes, bookingsRes] = await Promise.all([
        supabase
          .from("room_inventory")
          .select("*")
          .order("room_number", { ascending: true }),
        supabase.from("room_types").select("id, name"),
        fetch("/api/admin/bookings", { cache: "no-store" }),
      ]);

      const typeMap: Record<string, string> = {};
      if (typesRes.data) typesRes.data.forEach((t) => (typeMap[t.id] = t.name));

      const roomsMap: Record<string, RoomInventory[]> = {};
      if (inventoryRes.data) {
        inventoryRes.data.forEach((room: ApiRoomResponse) => {
          const typeName = typeMap[room.room_type_id] || "Uncategorized";
          if (!roomsMap[typeName]) roomsMap[typeName] = [];
          roomsMap[typeName].push({
            id: room.id,
            room_number: room.room_number,
            room_type_id: room.room_type_id,
            type_name: typeName,
          });
        });
      }
      setGroupedRooms(roomsMap);

      if (bookingsRes.ok) {
        const allBookings = await bookingsRes.json();
        const endWindow = addDays(startDate, DAY_COUNT);
        const startStr = formatYMD(startDate);
        const endStr = formatYMD(endWindow);

        const windowBookings = allBookings
          .filter(
            (b: ApiBookingResponse) =>
              b.status !== "cancelled" && b.status !== "failed",
          )
          .map((b: ApiBookingResponse) => {
            const checkIn = b.check_in_date
              ? String(b.check_in_date).substring(0, 10)
              : "";
            const checkOut = b.check_out_date
              ? String(b.check_out_date).substring(0, 10)
              : "";

            return {
              id: b.id,
              guest_name: b.users?.full_name || "Guest",
              room_type_id: b.room_type_id,
              assigned_room_id: b.assigned_room_id,
              checkIn,
              checkOut,
              checkOutDisplay: normalizeCheckout(checkIn, checkOut),
              status: b.status,
            };
          })
          .filter(
            (b: Booking) =>
              b.checkIn && b.checkOutDisplay > startStr && b.checkIn < endStr,
          );

        setBookings(windowBookings);
      }
    } catch (error) {
      console.error("Timeline fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  const shiftDays = (offset: number) => {
    setStartDate((current) => addDays(current, offset));
  };

  const jumpToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartDate(today);
  };

  const todayStr = formatYMD(new Date());
  const queryLower = query.trim().toLowerCase();
  const visibleBookings = useMemo(
    () =>
      queryLower
        ? bookings.filter((booking) =>
            [
              booking.guest_name,
              booking.status,
              booking.checkIn,
              booking.checkOut,
              booking.id,
            ]
              .join(" ")
              .toLowerCase()
              .includes(queryLower),
          )
        : bookings,
    [bookings, queryLower],
  );

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative z-0">
      <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row gap-4 justify-between xl:items-center bg-[#0A1A44] text-white">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-300" />
          <div>
            <h2 className="font-bold text-lg">Booking Timeline</h2>
            <p className="text-xs text-blue-100">
              Click a booking bar to open it in reservations.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-100" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search timeline..."
              className="w-full sm:w-52 rounded-lg bg-white/10 border border-white/20 pl-9 pr-3 py-2 text-sm placeholder:text-blue-100 outline-none focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={jumpToToday}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-xs rounded-lg font-bold transition-colors shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              onClick={() => shiftDays(-7)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium w-52 text-center">
              {startDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {" - "}
              {days[days.length - 1]?.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => shiftDays(7)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative overflow-auto max-h-[32rem] custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : Object.keys(groupedRooms).length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            No room inventory found.
          </div>
        ) : (
          <div className="min-w-max">
            <div className="flex sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
              <div className="w-52 shrink-0 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-3 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center">
                Room / Category
              </div>
              {days.map((day) => {
                const dayStr = formatYMD(day);
                const isToday = dayStr === todayStr;
                return (
                  <div
                    key={dayStr}
                    className={`w-28 shrink-0 p-2 text-center border-r border-slate-200 flex flex-col items-center justify-center ${
                      isToday ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span
                      className={`text-sm font-black mx-auto mt-0.5 ${
                        isToday
                          ? "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center"
                          : "text-slate-800"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                      {day.getFullYear()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col pb-4">
              {Object.entries(groupedRooms).map(([category, rooms]) => {
                const roomTypeId = rooms[0]?.room_type_id;
                const unassignedBookings = visibleBookings.filter(
                  (booking) =>
                    booking.room_type_id === roomTypeId &&
                    !booking.assigned_room_id,
                );

                return (
                  <div key={category} className="border-b border-slate-300">
                    <div className="flex bg-blue-50/70">
                      <div className="w-52 shrink-0 sticky left-0 z-10 bg-blue-50 px-3 py-2 text-xs font-black text-[#0A1A44] uppercase tracking-widest border-r border-blue-100">
                        {category}
                      </div>
                      <div className="h-8" style={{ width: DAY_COUNT * CELL_WIDTH }} />
                    </div>

                    {rooms.map((room) => {
                      const rowBookings = visibleBookings.filter(
                        (booking) => booking.assigned_room_id === room.id,
                      );

                      return (
                        <div
                          key={room.id}
                          className="flex group hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-52 shrink-0 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 p-3 flex items-center">
                            <span className="text-sm font-bold text-slate-700">
                              Room {room.room_number}
                            </span>
                          </div>
                          <div
                            className="relative h-12"
                            style={{ width: DAY_COUNT * CELL_WIDTH }}
                          >
                            <TimelineCells days={days} todayStr={todayStr} />
                            {rowBookings.map((booking) => (
                              <BookingBar
                                key={booking.id}
                                booking={booking}
                                startDate={startDate}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {unassignedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex bg-orange-50/30 border-t border-dashed border-orange-200"
                      >
                        <div className="w-52 shrink-0 sticky left-0 z-10 bg-orange-50 border-r border-orange-200 p-3 flex items-center">
                          <span className="text-xs font-bold text-orange-700">
                            Queue
                          </span>
                        </div>
                        <div
                          className="relative h-12"
                          style={{ width: DAY_COUNT * CELL_WIDTH }}
                        >
                          <TimelineCells days={days} todayStr={todayStr} />
                          <BookingBar
                            booking={booking}
                            startDate={startDate}
                            compact
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-bold text-slate-600 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-300" /> Pending
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-300" /> Confirmed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-300" /> Checked In
        </div>
      </div>
    </section>
  );
}
