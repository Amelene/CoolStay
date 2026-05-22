"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

type MovementType = "in" | "out";

type RoomSummary = {
  id: string;
  room_number: string;
};

type SupplyItem = {
  id: string;
  item_name: string;
  current_stock: number;
  unit: string;
};

type SupplyRow = {
  key: string;
  supply_id: string;
  quantity: number;
  notes: string;
};

type RoomSuppliesModalProps = {
  isOpen: boolean;
  room: RoomSummary | null;
  defaultMovementType?: MovementType;
  onClose: () => void;
};

const createRowKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function RoomSuppliesModal({
  isOpen,
  room,
  defaultMovementType = "out",
  onClose,
}: RoomSuppliesModalProps) {
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [rows, setRows] = useState<SupplyRow[]>([]);
  const [movementType, setMovementType] =
    useState<MovementType>(defaultMovementType);
  const [loadingSupplies, setLoadingSupplies] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setMovementType(defaultMovementType);
    setLoadingSupplies(true);

    const fetchSupplies = async () => {
      try {
        const res = await fetch("/api/admin/inventory/room-supplies", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load supplies");

        const loadedSupplies = (data.supplies || []) as SupplyItem[];
        setSupplies(loadedSupplies);
        setRows([
          {
            key: createRowKey(),
            supply_id: loadedSupplies[0]?.id || "",
            quantity: 1,
            notes: "",
          },
        ]);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load supplies",
        );
        setSupplies([]);
        setRows([]);
      } finally {
        setLoadingSupplies(false);
      }
    };

    fetchSupplies();
  }, [isOpen, defaultMovementType]);

  const supplyMap = useMemo(
    () => new Map(supplies.map((supply) => [supply.id, supply])),
    [supplies],
  );

  if (!isOpen || !room) return null;

  const updateRow = (
    key: string,
    patch: Partial<Omit<SupplyRow, "key">>,
  ) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        key: createRowKey(),
        supply_id: supplies[0]?.id || "",
        quantity: 1,
        notes: "",
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const handleSubmit = async () => {
    if (rows.length === 0) {
      toast.error("Add at least one item.");
      return;
    }

    const invalidRow = rows.find(
      (row) => !row.supply_id || row.quantity <= 0 || !Number.isFinite(row.quantity),
    );
    if (invalidRow) {
      toast.error("Each row needs an item and a quantity greater than 0.");
      return;
    }

    if (movementType === "out") {
      const usageBySupply = new Map<string, number>();
      rows.forEach((row) => {
        usageBySupply.set(
          row.supply_id,
          (usageBySupply.get(row.supply_id) || 0) + row.quantity,
        );
      });

      for (const [supplyId, quantity] of usageBySupply.entries()) {
        const item = supplyMap.get(supplyId);
        if (item && quantity > Number(item.current_stock || 0)) {
          toast.error(`Not enough stock for ${item.item_name}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/inventory/room-supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: room.id,
          movement_type: movementType,
          items: rows.map((row) => ({
            supply_id: row.supply_id,
            quantity: row.quantity,
            notes: row.notes.trim() || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save supplies");

      toast.success(
        movementType === "in"
          ? "Room supply return recorded."
          : "Room supply refill recorded.",
      );
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A1A44] px-5 py-4 text-white">
          <div>
            <h2 className="font-serif text-lg font-bold">Room Supplies</h2>
            <p className="text-xs text-blue-100">Room {room.room_number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-blue-100 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-5">
          <div className="mb-5 inline-grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMovementType("out")}
              className={`flex items-center justify-center gap-2 rounded-md px-5 py-2 ${
                movementType === "out"
                  ? "bg-red-600 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              OUT
            </button>
            <button
              type="button"
              onClick={() => setMovementType("in")}
              className={`flex items-center justify-center gap-2 rounded-md px-5 py-2 ${
                movementType === "in"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              IN
            </button>
          </div>

          {loadingSupplies ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading supplies...
            </div>
          ) : supplies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No active inventory items are available.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => {
                const selectedSupply = supplyMap.get(row.supply_id);
                return (
                  <div
                    key={row.key}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="grid gap-3 lg:grid-cols-[1fr_130px_1fr_38px]">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                          Item
                        </span>
                        <select
                          value={row.supply_id}
                          onChange={(event) =>
                            updateRow(row.key, {
                              supply_id: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          {supplies.map((supply) => (
                            <option key={supply.id} value={supply.id}>
                              {supply.item_name}
                            </option>
                          ))}
                        </select>
                        {selectedSupply && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Package className="h-3 w-3" />
                            Stock: {selectedSupply.current_stock}{" "}
                            {selectedSupply.unit}
                          </span>
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                          Quantity
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(event) =>
                            updateRow(row.key, {
                              quantity: Math.max(
                                1,
                                Number(event.target.value) || 1,
                              ),
                            })
                          }
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                          Remarks
                        </span>
                        <input
                          value={row.notes}
                          onChange={(event) =>
                            updateRow(row.key, { notes: event.target.value })
                          }
                          placeholder={
                            movementType === "out"
                              ? "e.g. Standard refill"
                              : "e.g. Over-issued item"
                          }
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          disabled={rows.length === 1}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          title={`Remove item ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingSupplies || supplies.length === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${
              movementType === "in"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : movementType === "in" ? (
              <ArrowUpCircle className="h-4 w-4" />
            ) : (
              <ArrowDownCircle className="h-4 w-4" />
            )}
            Save {movementType === "in" ? "IN" : "OUT"}
          </button>
        </div>
      </div>
    </div>
  );
}
