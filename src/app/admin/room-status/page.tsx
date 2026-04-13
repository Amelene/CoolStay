"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  DoorOpen,
  DoorClosed,
  Sparkles,
  Wrench,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button"; // Make sure you have this, or use standard <button>

interface RoomInventory {
  id: string;
  room_type_id: string;
  room_number: string;
  status:
    | "available"
    | "occupied"
    | "cleaning"
    | "maintenance"
    | "out_of_order";
}

export default function RoomStatusDashboard() {
  const [loading, setLoading] = useState(true);
  const [groupedRooms, setGroupedRooms] = useState<
    Record<string, RoomInventory[]>
  >({});

  // 🔒 NEW: Safety Modal State
  const [selectedRoom, setSelectedRoom] = useState<RoomInventory | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: roomsData } = await supabase
        .from("room_inventory")
        .select("*")
        .order("room_number", { ascending: true });
      const { data: typesData } = await supabase
        .from("room_types")
        .select("id, name");

      if (!roomsData || !typesData) throw new Error("Failed to load data");

      const typeMap: Record<string, string> = {};
      typesData.forEach((t) => (typeMap[t.id] = t.name));

      const grouped: Record<string, RoomInventory[]> = {};
      roomsData.forEach((room) => {
        const catName = typeMap[room.room_type_id] || "Uncategorized";
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(room);
      });

      setGroupedRooms(grouped);
    } catch {
      toast.error("Failed to fetch room status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // 🔒 NEW: Opens the safety modal
  const handleRoomClick = (room: RoomInventory) => {
    if (room.status === "occupied") {
      toast.error(
        "Occupied rooms must be cleared via the Check-Out flow in Reservations.",
      );
      return;
    }
    setSelectedRoom(room);
    setNewStatus(room.status); // Default to current status
  };

  // 🔒 NEW: Executes the confirmed change
  const confirmStatusChange = async () => {
    if (!selectedRoom || newStatus === selectedRoom.status) {
      setSelectedRoom(null);
      return;
    }

    setIsUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("room_inventory")
        .update({ status: newStatus })
        .eq("id", selectedRoom.id);

      if (error) throw error;

      toast.success(`Room updated to ${newStatus.replace("_", " ")}`);
      await fetchStatus();
      setSelectedRoom(null);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "available":
        return {
          color: "bg-green-50 border-green-200 text-green-700",
          icon: DoorOpen,
          label: "Available",
          dot: "bg-green-500",
        };
      case "occupied":
        return {
          color: "bg-red-50 border-red-200 text-red-700",
          icon: DoorClosed,
          label: "Occupied",
          dot: "bg-red-500",
        };
      case "cleaning":
        return {
          color: "bg-blue-50 border-blue-200 text-blue-700",
          icon: Sparkles,
          label: "Cleaning",
          dot: "bg-blue-500",
        };
      case "maintenance":
      case "out_of_order":
        return {
          color: "bg-orange-50 border-orange-200 text-orange-700",
          icon: Wrench,
          label: "Maintenance",
          dot: "bg-orange-500",
        };
      default:
        return {
          color: "bg-slate-50 border-slate-200 text-slate-700",
          icon: DoorClosed,
          label: "Unknown",
          dot: "bg-slate-500",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1A44] font-serif">
            Housekeeping & Room Status
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Live overview of physical room conditions.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{" "}
          Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A1A44] mb-4" />{" "}
          Loading movie seats...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedRooms).map(([categoryName, rooms]) => (
            <div
              key={categoryName}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
            >
              <h2 className="text-lg font-bold text-[#0A1A44] mb-4 border-b border-slate-100 pb-2">
                {categoryName}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rooms.map((room) => {
                  const config = getStatusConfig(room.status);
                  const Icon = config.icon;

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleRoomClick(room)}
                      className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${config.color} hover:shadow-md hover:scale-105 active:scale-95`}
                    >
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shadow-sm border border-white ${config.dot}`}
                        ></span>
                      </div>
                      <Icon className="w-7 h-7 opacity-80" />
                      <div className="text-center">
                        <span className="block text-xs font-black tracking-wide">
                          {room.room_number}
                        </span>
                        <span className="block text-[9px] uppercase font-bold opacity-70 mt-0.5">
                          {config.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔒 NEW: THE SAFETY MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center">
              <h2 className="font-bold">Update Room Status</h2>
              <button
                onClick={() => setSelectedRoom(null)}
                className="hover:bg-white/10 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                You are updating{" "}
                <strong className="text-slate-800">
                  {selectedRoom.room_number}
                </strong>
                . Select the new physical status for this room.
              </p>

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-[#0A1A44]"
              >
                <option value="available">
                  🟢 Available (Ready for Guests)
                </option>
                <option value="cleaning">🔵 Cleaning (Housekeeping)</option>
                <option value="maintenance">
                  🟠 Maintenance (Needs Repair)
                </option>
                <option value="out_of_order">
                  🔴 Out of Order (Do Not Use)
                </option>
              </select>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <Button
                  onClick={confirmStatusChange}
                  disabled={isUpdating || newStatus === selectedRoom.status}
                  className="flex-1 py-3 text-sm bg-[#0A1A44] text-white rounded-xl shadow-md"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Confirm Status"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
