"use client";

import { useState } from "react";
import { X, Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface AddSupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSupplyModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSupplyModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "Toiletries",
    min_stock: 10,
    unit: "pcs",
    cost: 0,
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.item_name) return toast.error("Item name is required");

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to add item");

      toast.success("Item added successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Error adding item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">
            <PackagePlus className="w-5 h-5" /> Add New Supply
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Item Name
            </label>
            <input
              className="w-full p-2 border rounded-lg"
              placeholder="e.g. Bath Soap"
              value={formData.item_name}
              onChange={(e) =>
                setFormData({ ...formData, item_name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Category
              </label>
              <select
                className="w-full p-2 border rounded-lg bg-white"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <option value="Toiletries">Toiletries</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Linens">Linens</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Unit
              </label>
              <select
                className="w-full p-2 border rounded-lg bg-white"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
              >
                <option value="pcs">Pieces</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
                <option value="sets">Sets</option>
                <option value="kg">Kg</option>
                <option value="liters">Liters</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg"
                value={formData.min_stock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_stock: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Cost (₱)
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#0A1A44] hover:bg-blue-900 mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              "Save Item"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
