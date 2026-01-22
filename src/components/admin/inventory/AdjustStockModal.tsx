"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface Item {
  id: string;
  item_name: string;
  current_stock: number;
  unit: string;
}

interface Room {
  id: string;
  room_number: string;
  room_type_id: string;
}

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: Item | null;
}

export default function AdjustStockModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: AdjustStockModalProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"restock" | "usage">("usage");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Room Selection State
  const [roomId, setRoomId] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch rooms for the dropdown
      const fetchRooms = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("room_inventory")
          .select("id, room_number, room_type_id");
        if (data) setRooms(data);
      };
      fetchRooms();

      // Reset Form
      setQuantity(1);
      setNotes("");
      setRoomId("");
      setType("usage");
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async () => {
    // 1. Validation
    if (quantity <= 0) return toast.error("Quantity must be greater than 0");
    if (type === "usage" && quantity > item.current_stock)
      return toast.error("Not enough stock!");

    // ✅ Mandatory Notes
    if (!notes.trim())
      return toast.error("Please provide a reason/note for this adjustment.");

    // ✅ Mandatory Room for Usage (Optional: can be 'General' if roomId is empty, handled by backend logic but let's enforce or allow 'General')
    // Let's assume selecting a room is optional (e.g. for cleaning cart), but we encourage it.
    // If you want it STRICT:
    // if (type === "usage" && !roomId) return toast.error("Please select a room.");

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supply_id: item.id,
          type,
          quantity,
          notes,
          room_id: roomId || null, // Send null if empty
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");

      toast.success(type === "restock" ? "Stock Added" : "Stock Distributed");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error) toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center">
          <div>
            <h2 className="font-bold">Adjust Inventory</h2>
            <p className="text-xs text-slate-300 opacity-80">
              {item.item_name} (Current: {item.current_stock} {item.unit})
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setType("usage")}
              className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                type === "usage"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ArrowDown className="w-4 h-4" /> OUT (Use)
            </button>
            <button
              onClick={() => setType("restock")}
              className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                type === "restock"
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ArrowUp className="w-4 h-4" /> IN (Add)
            </button>
          </div>

          {/* Quantity */}
          <div className="text-center">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quantity ({item.unit})
            </label>
            <div className="flex items-center justify-center gap-4 mt-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xl"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 0))
                }
                className="w-24 text-center text-3xl font-bold text-[#0A1A44] outline-none border-b-2 border-slate-200 focus:border-[#0A1A44] bg-transparent"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xl"
              >
                +
              </button>
            </div>
          </div>

          {/* Room Selector (Only for OUT) */}
          {type === "usage" && (
            <div className="animate-in slide-in-from-top-2 fade-in">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Assigned Room / Location
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50"
              >
                <option value="">General Use / Front Desk</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mandatory Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Notes <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
              placeholder={
                type === "usage"
                  ? "e.g. Guest Request, Cleaning"
                  : "e.g. Monthly Supplier Delivery"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-6 text-md ${
              type === "restock"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              `Confirm ${type === "restock" ? "Restock" : "Distribution"}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
