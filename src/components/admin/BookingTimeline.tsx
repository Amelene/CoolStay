"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

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
  status: string;
}

const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function BookingTimeline() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [days, setDays] = useState<Date[]>([]);
  const [groupedRooms, setGroupedRooms] = useState<
    Record<string, RoomInventory[]>
  >({});
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const newDays: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      newDays.push(d);
    }
    setDays(newDays);
  }, [startDate]);

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

        const endWindow = new Date(startDate);
        endWindow.setDate(endWindow.getDate() + 14);

        const startStr = formatYMD(startDate);
        const endStr = formatYMD(endWindow);

        const windowBookings = allBookings
          .filter(
            (b: ApiBookingResponse) =>
              b.status !== "cancelled" && b.status !== "failed",
          )
          .map((b: ApiBookingResponse) => ({
            id: b.id,
            guest_name: b.users?.full_name || "Guest",
            room_type_id: b.room_type_id,
            assigned_room_id: b.assigned_room_id,
            checkIn: b.check_in_date
              ? String(b.check_in_date).substring(0, 10)
              : "",
            checkOut: b.check_out_date
              ? String(b.check_out_date).substring(0, 10)
              : "",
            status: b.status,
          }))
          .filter((b: Booking) => b.checkOut > startStr && b.checkIn <= endStr);

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
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + offset);
    newDate.setHours(0, 0, 0, 0);
    setStartDate(newDate);
  };

  // Jump back to the current real-world day
  const jumpToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartDate(today);
  };

  const getBookingStyle = (
    status: string,
    dayStr: string,
    checkIn: string,
    checkOut: string,
  ) => {
    const isStart = dayStr === checkIn;

    const [y, m, d] = checkOut.split("-");
    const prevDay = new Date(Number(y), Number(m) - 1, Number(d));
    prevDay.setDate(prevDay.getDate() - 1);
    const isEnd = dayStr === formatYMD(prevDay);

    let color = "bg-blue-200 text-blue-900 border-blue-400";
    if (status === "pending")
      color = "bg-yellow-200 text-yellow-900 border-yellow-400";
    if (status === "checked_in")
      color = "bg-green-200 text-green-900 border-green-400";

    const rounded = `${isStart ? "ml-1 rounded-l-md border-l-2" : "border-l-0 -ml-px"} ${isEnd ? "mr-1 rounded-r-md border-r-2" : "border-r-0 -mr-px"}`;

    return `absolute inset-x-0 h-8 z-10 ${color} ${rounded} border-y-2 text-[10px] font-bold px-2 flex flex-col justify-center shadow-sm overflow-hidden whitespace-nowrap`;
  };

  const todayStr = formatYMD(new Date());
  const timelineStartStr = formatYMD(startDate);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-[#0A1A44] text-white">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-300" />
          <h2 className="font-bold text-lg">Timeline</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* 🔒 NEW: Today Button */}
          <button
            onClick={jumpToToday}
            className="px-3 py-1.5 mr-2 bg-blue-600 hover:bg-blue-500 text-xs rounded-md font-bold transition-colors shadow-sm"
          >
            Today
          </button>

          <button
            onClick={() => shiftDays(-7)}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 🔒 NEW: Explicit Years in Header */}
          <span className="text-sm font-medium w-48 text-center">
            {startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {" — "}
            {days[days.length - 1]?.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          <button
            onClick={() => shiftDays(7)}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-125 custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : Object.keys(groupedRooms).length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            No room inventory found.
          </div>
        ) : (
          <div className="min-w-max inline-block align-top">
            {/* Column Headers */}
            <div className="flex sticky top-0 z-30 bg-slate-50 border-b border-slate-200 shadow-sm">
              <div className="w-48 shrink-0 sticky left-0 z-40 bg-slate-50 border-r border-slate-200 p-3 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center">
                Room / Category
              </div>
              {days.map((day, i) => {
                const dayStr = formatYMD(day);
                const isToday = dayStr === todayStr;
                return (
                  <div
                    key={i}
                    className={`w-24 shrink-0 p-2 text-center border-r border-slate-200 flex flex-col items-center justify-center ${isToday ? "bg-blue-50" : ""}`}
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span
                      className={`text-sm font-black mx-auto mt-0.5 ${isToday ? "text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center" : "text-slate-800"}`}
                    >
                      {day.getDate()}
                    </span>
                    {/* 🔒 NEW: Year printed under every day */}
                    <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                      {day.getFullYear()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="flex flex-col pb-6">
              {Object.entries(groupedRooms).map(([category, rooms]) => {
                const unassignedBookings = bookings.filter(
                  (b) =>
                    b.room_type_id === rooms[0]?.room_type_id &&
                    !b.assigned_room_id,
                );

                return (
                  <div
                    key={category}
                    className="flex flex-col border-b border-slate-300"
                  >
                    <div className="flex bg-blue-50/50">
                      <div className="w-full px-3 py-1.5 text-xs font-black text-[#0A1A44] uppercase tracking-widest bg-blue-50/90 sticky left-0 z-20">
                        {category}
                      </div>
                    </div>

                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex group hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-48 shrink-0 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-200 p-3 flex items-center">
                          <span className="text-sm font-bold text-slate-700">
                            {room.room_number}
                          </span>
                        </div>
                        {days.map((day, i) => {
                          const dayStr = formatYMD(day);
                          const booking = bookings.find(
                            (b) =>
                              b.assigned_room_id === room.id &&
                              dayStr >= b.checkIn &&
                              dayStr < b.checkOut,
                          );

                          return (
                            <div
                              key={i}
                              className={`w-24 shrink-0 border-r border-slate-100 flex items-center relative h-12 ${dayStr === todayStr ? "bg-blue-50/40" : ""}`}
                            >
                              {booking && (
                                <div
                                  className={getBookingStyle(
                                    booking.status,
                                    dayStr,
                                    booking.checkIn,
                                    booking.checkOut,
                                  )}
                                >
                                  <span className="truncate">
                                    {dayStr === booking.checkIn ||
                                    dayStr === timelineStartStr
                                      ? booking.guest_name
                                      : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Queue */}
                    {unassignedBookings.length > 0 && (
                      <div className="flex bg-orange-50/30 border-t border-dashed border-orange-200">
                        <div className="w-48 shrink-0 sticky left-0 z-20 bg-orange-50 border-r border-orange-200 p-3 flex items-center">
                          <span className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            Queue
                          </span>
                        </div>
                        {days.map((day, i) => {
                          const dayStr = formatYMD(day);
                          const todaysUnassigned = unassignedBookings.filter(
                            (b) => dayStr >= b.checkIn && dayStr < b.checkOut,
                          );

                          return (
                            <div
                              key={i}
                              className="w-24 shrink-0 border-r border-orange-100/50 flex flex-col justify-start pt-2 px-1 min-h-12 gap-1 relative z-10"
                            >
                              {todaysUnassigned.map((booking) => (
                                <div
                                  key={booking.id}
                                  className={`${getBookingStyle(booking.status, dayStr, booking.checkIn, booking.checkOut)} relative! inset-auto! border-dashed opacity-80`}
                                  title={booking.guest_name}
                                >
                                  <span className="truncate">
                                    {dayStr === booking.checkIn ||
                                    dayStr === timelineStartStr
                                      ? booking.guest_name.split(" ")[0]
                                      : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-bold text-slate-600 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-300"></span> Pending
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-300"></span> Confirmed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-300"></span> Checked In
        </div>
      </div>
    </div>
  );
}
