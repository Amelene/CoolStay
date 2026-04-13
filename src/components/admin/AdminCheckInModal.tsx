"use client";

import { useState, useEffect } from "react";
import { X, Loader2, DoorOpen, DoorClosed, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface RoomInventory {
  id: string;
  room_number: string;
  status: "available" | "occupied" | "cleaning" | "maintenance";
}

interface AdminCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    guestName: string;
    room_type_id: string;
    roomTypeName: string;
  } | null;
  onSuccess: () => void;
}

export default function AdminCheckInModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: AdminCheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<RoomInventory[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  useEffect(() => {
    if (isOpen && booking?.room_type_id) {
      fetchPhysicalRooms(booking.room_type_id);
    }
  }, [isOpen, booking]);

  const fetchPhysicalRooms = async (typeId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("room_inventory")
      .select("id, room_number, status")
      .eq("room_type_id", typeId)
      .order("room_number", { ascending: true });

    if (data) setRooms(data as RoomInventory[]);
  };

  if (!isOpen || !booking) return null;

  const handleCheckIn = async () => {
    if (!selectedRoomId) {
      toast.error("Please select an available room.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: booking.id,
          status: "checked_in",
          assigned_room_id: selectedRoomId,
          security_deposit_status: "held", // Admin physically takes the ₱1000 cash here
        }),
      });

      if (!res.ok) throw new Error("Failed to check in guest");

      toast.success("Guest checked in! Room marked as occupied.");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("An error occurred during check-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0A1A44] p-5 text-white flex justify-between items-center">
          <div>
            <h2 className="font-serif font-bold text-lg">Check-In Guest</h2>
            <p className="text-xs text-blue-200">{booking.guestName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
              Assign {booking.roomTypeName} (Physical Room)
            </h3>

            {/* THE MOVIE SEAT GRID */}
            <div className="grid grid-cols-3 gap-3">
              {rooms.map((room) => {
                const isAvailable = room.status === "available";
                const isSelected = selectedRoomId === room.id;

                return (
                  <button
                    key={room.id}
                    disabled={!isAvailable}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`
                      relative p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all
                      ${
                        !isAvailable
                          ? "bg-red-50 border-red-200 opacity-60 cursor-not-allowed"
                          : isSelected
                            ? "bg-[#0A1A44] border-[#0A1A44] shadow-md scale-105"
                            : "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300"
                      }
                    `}
                  >
                    {!isAvailable ? (
                      <DoorClosed
                        className={`w-6 h-6 ${isSelected ? "text-white" : "text-red-400"}`}
                      />
                    ) : (
                      <DoorOpen
                        className={`w-6 h-6 ${isSelected ? "text-white" : "text-green-600"}`}
                      />
                    )}
                    <span
                      className={`text-xs font-bold ${isSelected ? "text-white" : !isAvailable ? "text-red-800" : "text-green-800"}`}
                    >
                      {room.room_number}
                    </span>

                    {/* Status Label */}
                    <div className="absolute top-1 right-1">
                      {!isAvailable && (
                        <span className="flex w-2 h-2 rounded-full bg-red-500"></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {rooms.length === 0 && (
              <p className="text-sm text-slate-500 italic text-center py-4">
                No physical rooms configured for this category.
              </p>
            )}
          </div>

          {/* Security Deposit Cash Prompt */}
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange-800 uppercase mb-1">
                Collect Cash Deposit
              </p>
              <p className="text-[11px] text-orange-700 leading-relaxed">
                Ensure you collect the <b>₱1,000 physical cash deposit</b> from
                the guest before confirming check-in. The system will
                automatically mark the deposit as &quot;Held&quot;.
              </p>
            </div>
          </div>

          <Button
            onClick={handleCheckIn}
            disabled={loading || !selectedRoomId}
            className="w-full py-4 text-sm bg-[#0A1A44] hover:bg-blue-900 text-white rounded-xl shadow-lg"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Confirm Check-In & Hold Deposit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
