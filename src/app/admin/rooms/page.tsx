"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import RoomModal from "@/components/admin/RoomModal";
import { toast } from "sonner"; // Import

interface RoomType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  total_rooms: number;
  capacity: number;
}

export default function RoomAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<RoomType | null>(null);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchRooms = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("room_types")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setRooms(data);
      if (error) console.error("Error fetching rooms:", error);

      setLoading(false);
    };

    fetchRooms();
  }, [refreshTrigger]);

  const openAddModal = () => {
    setRoomToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room) {
      setRoomToEdit(room);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoomId) return;
    if (!confirm("Are you sure you want to delete this room?")) return;

    setLoading(true);
    const toastId = toast.loading("Deleting room...");

    const supabase = createClient();
    const { error } = await supabase
      .from("room_types")
      .delete()
      .eq("id", selectedRoomId);

    if (error) {
      toast.dismiss(toastId);
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.dismiss(toastId);
      toast.success("Room deleted successfully");
      setSelectedRoomId(null);
      handleRefresh();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1A44]">
            Room Availability
          </h1>
          <p className="text-gray-500 text-sm">
            Manage room types and inventory
          </p>
        </div>

        <div className="flex gap-3 bg-white p-1.5 rounded-full shadow-sm border border-blue-100">
          <button
            className="px-6 py-2 bg-[#0A1A44] text-white text-xs font-bold rounded-full hover:bg-blue-900 transition-colors shadow-md"
            onClick={openAddModal}
          >
            ADD
          </button>

          <button
            className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${
              selectedRoomId
                ? "bg-[#0A1A44] text-white hover:bg-blue-900"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!selectedRoomId}
            onClick={openEditModal}
          >
            EDIT
          </button>

          <button
            className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${
              selectedRoomId
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!selectedRoomId}
            onClick={handleDelete}
          >
            DELETE
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-blue-300 animate-pulse">
          Loading rooms...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() =>
                setSelectedRoomId(room.id === selectedRoomId ? null : room.id)
              }
              className={`
                relative group cursor-pointer overflow-hidden rounded-4xl transition-all duration-300 border-2
                ${
                  selectedRoomId === room.id
                    ? "border-[#0A1A44] shadow-2xl scale-[1.02] bg-white"
                    : "border-transparent bg-blue-50/50 hover:bg-white hover:shadow-xl hover:-translate-y-1"
                }
              `}
            >
              <div className="relative h-48 w-full">
                <Image
                  src={room.image_url || "/images/background/coolstaybg.png"}
                  alt={room.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#0A1A44]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {selectedRoomId === room.id && (
                  <div className="absolute top-4 right-4 bg-[#0A1A44] text-white h-8 w-8 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                    ✓
                  </div>
                )}
              </div>
              <div className="p-5 text-center space-y-2">
                <h3 className="font-bold text-[#0A1A44] text-lg font-serif tracking-wide">
                  {room.name}
                </h3>
                <div className="flex justify-center items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    ₱{room.base_price.toLocaleString()}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {room.total_rooms} Units
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          <div
            onClick={openAddModal}
            className="border-2 border-dashed border-blue-200 rounded-4xl flex flex-col items-center justify-center h-[300px] text-blue-300 cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition-all group"
          >
            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform text-blue-200">
              +
            </div>
            <span className="font-bold uppercase tracking-widest text-sm">
              Add New Room
            </span>
          </div>
        </div>
      )}

      {isModalOpen && (
        <RoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleRefresh}
          roomToEdit={roomToEdit}
        />
      )}
    </div>
  );
}
