"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface DayStatus {
  date: string;
  isUserBooked: boolean;
  bookingCount: number;
}

interface BookingRange {
  check_in_date: string;
  check_out_date: string;
}

export function AvailabilityCalendar() {
  const [viewDate, setViewDate] = useState(new Date());
  const [dayStatuses, setDayStatuses] = useState<Record<string, DayStatus>>({});
  const [totalCapacity, setTotalCapacity] = useState(0); // ✅ NEW STATE

  // ... (date calculation logic remains the same) ...
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const emptySlots = firstDayOfMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const TOTAL_GRID_CELLS = 42;
  const usedCells = emptySlots + daysInMonth;
  const trailingSlots = TOTAL_GRID_CELLS - usedCells;

  useEffect(() => {
    const fetchMonthData = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();

      const [allBookingsRes, myBookingsRes, capacityRes] = await Promise.all([
        supabase
          .from("public_booked_dates")
          .select("check_in_date, check_out_date")
          .lte("check_in_date", endDate)
          .gte("check_out_date", startDate),

        user
          ? supabase
              .from("bookings")
              .select("check_in_date, check_out_date")
              .eq("guest_id", user.id)
              .in("status", ["confirmed", "pending", "checked_in"])
              .lte("check_in_date", endDate)
              .gte("check_out_date", startDate)
          : Promise.resolve({ data: [] }),

        // ✅ NEW: Fetch Total Resort Capacity
        supabase.from("room_types").select("total_rooms"),
      ]);

      // Calculate Total Capacity across ALL rooms
      const calculatedCapacity =
        capacityRes.data?.reduce(
          (sum, type) => sum + (type.total_rooms || 0),
          0,
        ) || 10; // Default to 10 if fetch fails

      setTotalCapacity(calculatedCapacity);

      const statusMap: Record<string, DayStatus> = {};

      const processBookings = (
        bookingList: BookingRange[],
        isPersonal: boolean,
      ) => {
        bookingList.forEach((booking) => {
          let loopDate = new Date(booking.check_in_date);
          const loopEnd = new Date(booking.check_out_date);

          if (loopDate < new Date(year, month, 1))
            loopDate = new Date(year, month, 1);

          while (loopDate < loopEnd && loopDate.getMonth() === month) {
            const dateKey = loopDate.getDate().toString();

            if (!statusMap[dateKey]) {
              statusMap[dateKey] = {
                date: dateKey,
                isUserBooked: false,
                bookingCount: 0,
              };
            }

            if (!isPersonal) {
              statusMap[dateKey].bookingCount += 1;
            } else {
              statusMap[dateKey].isUserBooked = true;
            }

            loopDate.setDate(loopDate.getDate() + 1);
          }
        });
      };

      if (allBookingsRes.data) processBookings(allBookingsRes.data, false);
      if (myBookingsRes.data) processBookings(myBookingsRes.data, true);

      setDayStatuses(statusMap);
    };

    fetchMonthData();
  }, [year, month]);

  // ... (nextMonth, prevMonth helpers remain the same) ...
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
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
    <div className="w-full max-w-[340px] mx-auto">
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-white/50">
        {/* ... (Header and Days Header remain the same) ... */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevMonth}
            className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 p-0 text-[#0A1A44]"
          >
            &lt;
          </Button>
          <h3 className="font-bold text-lg text-[#0A1A44] font-serif">
            {monthNames[month]} {year}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextMonth}
            className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 p-0 text-[#0A1A44]"
          >
            &gt;
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-wider">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-4 gap-x-2">
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day) => {
            const status = dayStatuses[day.toString()];
            const isMyTrip = status?.isUserBooked;

            // ✅ FIX: Compare against actual total capacity, not just 0
            const isFullyBooked = (status?.bookingCount || 0) >= totalCapacity;

            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            return (
              <div
                key={day}
                className="flex flex-col items-center justify-center relative group"
              >
                <span
                  className={`
                  text-sm font-medium transition-all h-8 w-8 flex items-center justify-center rounded-full
                  ${isMyTrip ? "bg-[#0A1A44] text-white shadow-md scale-110 ring-2 ring-blue-200" : isToday ? "bg-blue-100 text-blue-900 font-bold" : "text-gray-700 hover:bg-blue-50"}
                `}
                >
                  {day}
                </span>
                {/* Only show red dot if TRULY full and not my trip */}
                {isFullyBooked && !isMyTrip && (
                  <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white" />
                )}
              </div>
            );
          })}

          {Array.from({ length: Math.max(0, trailingSlots) }).map((_, i) => (
            <div key={`trail-${i}`} className="h-8" />
          ))}
        </div>

        {/* ... (Legend remains the same) ... */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px] text-gray-500 font-medium border-t border-gray-100 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0A1A44]"></span>
            <span>Your Trip</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>Fully Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-100"></span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
