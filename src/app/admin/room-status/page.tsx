"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  DoorOpen,
  DoorClosed,
  Sparkles,
  Wrench,
  RefreshCw,
  Building,
  CheckCircle2,
  Ban,
  Search,
  Filter,
  ChevronDown,
  Info,
  Lock,
  PackagePlus,
} from "lucide-react";
import { toast } from "sonner";
import RoomSuppliesModal from "@/components/admin/RoomSuppliesModal";

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
  categoryName?: string;
}

interface RoomStatusResponse {
  rooms: RoomInventory[];
  categories: string[];
  canUpdate: boolean;
}

export default function RoomStatusDashboard() {
  const [loading, setLoading] = useState(true);
  const [allRooms, setAllRooms] = useState<RoomInventory[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [supplyModalRoom, setSupplyModalRoom] = useState<RoomInventory | null>(
    null,
  );
  const [supplyModalDefaultType, setSupplyModalDefaultType] = useState<
    "in" | "out"
  >("out");

  const fetchStatus = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/room-status", {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to load data");

      const data = (await response.json()) as RoomStatusResponse;

      setAllRooms(data.rooms || []);
      setCategories(data.categories || ["All"]);
      setIsReadOnly(!data.canUpdate);
    } catch {
      toast.error("Failed to fetch room status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleInlineStatusUpdate = async (
    roomId: string,
    currentStatus: string,
    newStatus: RoomInventory["status"],
  ) => {
    if (currentStatus === "occupied") {
      toast.error(
        "Occupied rooms must be cleared via the Check-Out flow in Reservations.",
      );
      return;
    }
    if (currentStatus === newStatus) return;

    const previousRooms = [...allRooms];
    setAllRooms(
      allRooms.map((room) =>
        room.id === roomId ? { ...room, status: newStatus } : room,
      ),
    );

    try {
      const response = await fetch("/api/admin/room-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update status");
      }

      toast.success(`Room updated to ${newStatus.replace("_", " ")}`);
      if (currentStatus === "cleaning" && newStatus === "available") {
        const cleanedRoom = previousRooms.find((room) => room.id === roomId);
        if (cleanedRoom) {
          setSupplyModalDefaultType("out");
          setSupplyModalRoom(cleanedRoom);
        }
      }
    } catch (error) {
      setAllRooms(previousRooms);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
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
        return {
          color: "bg-orange-50 border-orange-200 text-orange-700",
          icon: Wrench,
          label: "Maintenance",
          dot: "bg-orange-500",
        };
      case "out_of_order":
        return {
          color: "bg-slate-100 border-slate-300 text-slate-700",
          icon: Ban,
          label: "Out of Order",
          dot: "bg-slate-600",
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

  const totalRooms = allRooms.length;
  const availableRooms = allRooms.filter(
    (r) => r.status === "available",
  ).length;
  const occupiedRooms = allRooms.filter((r) => r.status === "occupied").length;
  const cleaningRooms = allRooms.filter((r) => r.status === "cleaning").length;
  const maintenanceRooms = allRooms.filter(
    (r) => r.status === "maintenance",
  ).length;
  const outOfOrderRooms = allRooms.filter(
    (r) => r.status === "out_of_order",
  ).length;

  const filteredRooms = allRooms.filter((room) => {
    const matchesSearch =
      room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.status
        .replace(/_/g, " ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || room.categoryName === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedRooms = filteredRooms.reduce(
    (acc, room) => {
      const catName = room.categoryName || "Uncategorized";
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(room);
      return acc;
    },
    {} as Record<string, RoomInventory[]>,
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 relative">
      <RoomSuppliesModal
        isOpen={Boolean(supplyModalRoom)}
        room={supplyModalRoom}
        defaultMovementType={supplyModalDefaultType}
        onClose={() => setSupplyModalRoom(null)}
      />
      {/* 🔒 THE COMMAND BAR: Header, Tooltip, Search, Filter, and Refresh all in one sleek row */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#0A1A44] font-serif">
            Room Status
          </h1>
          {/* Subtle Hover Tooltip replacing the giant banner */}
          <div className="relative group flex items-center cursor-help">
            <Info className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
            <div className="absolute left-full ml-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              <strong>Occupied</strong> rooms cannot be manually updated here.
              They will automatically reset when you process a Guest Check-Out
              in Reservations.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0A1A44] outline-none transition-all"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0A1A44] outline-none font-medium text-slate-700 appearance-none transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchStatus}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 🔒 COMPACT KPI DASHBOARD: Tighter padding, smaller icons, sleeker layout */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Total
              </p>
              <p className="text-lg font-black text-slate-800 leading-none">
                {totalRooms}
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-green-100 flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Available
              </p>
              <p className="text-lg font-black text-green-600 leading-none">
                {availableRooms}
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-red-100 flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Occupied
              </p>
              <p className="text-lg font-black text-red-600 leading-none">
                {occupiedRooms}
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Cleaning
              </p>
              <p className="text-lg font-black text-blue-600 leading-none">
                {cleaningRooms}
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-orange-100 flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Maintenance
              </p>
              <p className="text-lg font-black text-orange-600 leading-none">
                {maintenanceRooms}
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Out of Order
              </p>
              <p className="text-lg font-black text-slate-700 leading-none">
                {outOfOrderRooms}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A1A44] mb-4" />
          Loading facility data...
        </div>
      ) : Object.keys(groupedRooms).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500">
          No rooms match your filter criteria.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRooms).map(([categoryName, rooms]) => (
            <div
              key={categoryName}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
            >
              <h2 className="text-base font-bold text-[#0A1A44] mb-4 border-b border-slate-100 pb-2">
                {categoryName}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {rooms.map((room) => {
                  const config = getStatusConfig(room.status);
                  const Icon = config.icon;

                  return (
                    <div
                      key={room.id}
                      className={`relative p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${config.color} hover:shadow-md group`}
                    >
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <span
                          className={`w-2 h-2 rounded-full shadow-sm border border-white ${config.dot}`}
                        ></span>
                      </div>
                      <Icon className="w-6 h-6 opacity-80 mt-1" />
                      <div className="text-center w-full">
                        <span className="block text-xs font-black tracking-wide">
                          {room.room_number}
                        </span>
                        <span className="block text-[9px] uppercase font-bold opacity-70 mt-0.5">
                          {config.label}
                        </span>
                      </div>

                      <div className="w-full mt-1 relative">
                        {room.status === "occupied" || isReadOnly ? (
                          <button
                            onClick={() =>
                              isReadOnly
                                ? undefined
                                : toast.error(
                                    "Please process check-outs in the Manage Bookings page.",
                                  )
                            }
                            className="w-full flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-md bg-slate-100/50 text-slate-400 cursor-not-allowed border border-slate-200/50"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            {isReadOnly ? "View Only" : "Occupied"}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                setOpenDropdownId(
                                  openDropdownId === room.id ? null : room.id,
                                )
                              }
                              className="w-full flex items-center justify-between text-[9px] font-bold uppercase tracking-wider py-1.5 px-2 rounded-md bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 transition-colors shadow-sm"
                            >
                              Change Status{" "}
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${openDropdownId === room.id ? "rotate-180" : ""}`}
                              />
                            </button>

                            {openDropdownId === room.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenDropdownId(null)}
                                />
                                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden py-1 animate-in zoom-in-95">
                                  {[
                                    "available",
                                    "cleaning",
                                    "maintenance",
                                    "out_of_order",
                                  ].map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => {
                                        handleInlineStatusUpdate(
                                          room.id,
                                          room.status,
                                          s as RoomInventory["status"],
                                        );
                                        setOpenDropdownId(null);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors ${
                                        room.status === s
                                          ? "text-blue-600 bg-blue-50"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {s.replace(/_/g, " ")}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isReadOnly) return;
                          setSupplyModalDefaultType("out");
                          setSupplyModalRoom(room);
                        }}
                        disabled={isReadOnly}
                        className="w-full flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider py-1.5 rounded-md bg-white/80 text-slate-700 border border-slate-200 hover:bg-white hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PackagePlus className="w-2.5 h-2.5" />
                        Supplies
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
