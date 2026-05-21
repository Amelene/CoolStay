"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  FileText,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import AddSupplyModal from "@/components/admin/inventory/AddSupplyModal";
import CurrentStockReport, {
  CurrentStockReportData,
} from "@/components/pdf/CurrentStockReport";

type SupplyItem = {
  id: string;
  item_name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  last_restocked: string | null;
  stock_in?: number;
  stock_out?: number;
};

type InventoryLog = {
  id: string;
  supply_id: string;
  usage_date: string;
  purpose: string;
  quantity_used: number;
  used_by: string;
  notes: string | null;
};

type ReportItem = {
  id: string;
  generated_at: string;
  report_content: string;
};

const toDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export default function InventoryPage() {
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [history, setHistory] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [transactionType, setTransactionType] = useState<"restock" | "usage">(
    "restock",
  );
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    toDateTimeLocal(new Date()),
  );
  const [itemSearch, setItemSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load inventory");

      setItems(data);
      setSelectedItemId((current) =>
        data?.some((item: SupplyItem) => item.id === current)
          ? current
          : data?.[0]?.id || "",
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    const res = await fetch("/api/admin/inventory/report", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      setReports(data);
    }
  };

  const fetchHistory = async (supplyId: string) => {
    if (!supplyId) return;
    setHistoryLoading(true);

    try {
      const res = await fetch(
        `/api/admin/inventory/logs?supply_id=${encodeURIComponent(supplyId)}&order=asc`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setHistory(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load item history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchReports();
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      fetchHistory(selectedItemId);
    } else {
      setHistory([]);
    }
  }, [selectedItemId]);

  const itemTotals = useMemo(() => {
    const stockIn = history.reduce(
      (sum, log) =>
        log.purpose === "Restock" ? sum + Number(log.quantity_used || 0) : sum,
      0,
    );
    const stockOut = history.reduce(
      (sum, log) =>
        log.purpose === "Restock" ? sum : sum + Number(log.quantity_used || 0),
      0,
    );
    const opening = selectedItem
      ? selectedItem.current_stock - stockIn + stockOut
      : 0;

    return { stockIn, stockOut, opening };
  }, [history, selectedItem]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history;

    return history.filter((log) => {
      const text = [
        log.purpose,
        log.quantity_used,
        log.notes || "",
        log.used_by || "",
        new Date(log.usage_date).toLocaleString("en-US"),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [history, historySearch]);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [
        item.item_name,
        item.category,
        item.unit,
        item.current_stock,
        item.minimum_stock,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [items, itemSearch]);

  const handleSaveTransaction = async () => {
    if (!selectedItem) return toast.error("Please select an item.");
    if (quantity <= 0) return toast.error("Quantity must be greater than 0.");
    if (transactionType === "usage" && quantity > selectedItem.current_stock) {
      return toast.error("Not enough stock for this OUT transaction.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supply_id: selectedItem.id,
          type: transactionType,
          quantity,
          notes: remarks.trim() || null,
          usage_date: new Date(transactionDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save transaction");

      toast.success("Inventory transaction saved.");
      setQuantity(1);
      setRemarks("");
      setTransactionDate(toDateTimeLocal(new Date()));
      await fetchInventory();
      await fetchHistory(selectedItem.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Saving inventory snapshot...");

    try {
      const res = await fetch("/api/admin/inventory/report", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save snapshot");
      toast.success("Snapshot saved.", { id: toastId });
      await fetchReports();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save snapshot", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCurrentStock = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Building inventory PDF...");

    try {
      const totalStockIn = items.reduce(
        (sum, item) => sum + (item.stock_in || 0),
        0,
      );
      const totalStockOut = items.reduce(
        (sum, item) => sum + (item.stock_out || 0),
        0,
      );

      const reportData: CurrentStockReportData = {
        generatedAt: new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        generatedBy: "Admin",
        summary: {
          totalItems: items.length,
          lowStockCount: items.filter(
            (item) => item.current_stock <= item.minimum_stock,
          ).length,
          totalStockIn,
          totalStockOut,
        },
        items: items.map((item) => ({
          item_name: item.item_name,
          category: item.category,
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          unit: item.unit,
          stock_in: item.stock_in || 0,
          stock_out: item.stock_out || 0,
        })),
      };

      const blob = await pdf(<CurrentStockReport data={reportData} />).toBlob();
      const date = new Date().toISOString().slice(0, 10);
      saveAs(blob, `CoolStay_Inventory_Stock_Summary_${date}.pdf`);
      toast.success("Inventory PDF downloaded.", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSelectedItem = async () => {
    if (!selectedItem) return toast.error("Please select an item.");

    setIsGenerating(true);
    const toastId = toast.loading("Building item PDF...");

    try {
      const reportData: CurrentStockReportData = {
        generatedAt: new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        generatedBy: "Admin",
        filterLabel: selectedItem.item_name,
        summary: {
          totalItems: 1,
          lowStockCount:
            selectedItem.current_stock <= selectedItem.minimum_stock ? 1 : 0,
          totalStockIn: itemTotals.stockIn,
          totalStockOut: itemTotals.stockOut,
        },
        items: [
          {
            item_name: selectedItem.item_name,
            category: selectedItem.category,
            current_stock: selectedItem.current_stock,
            minimum_stock: selectedItem.minimum_stock,
            unit: selectedItem.unit,
            stock_in: itemTotals.stockIn,
            stock_out: itemTotals.stockOut,
          },
        ],
        history,
      };

      const blob = await pdf(<CurrentStockReport data={reportData} />).toBlob();
      const date = new Date().toISOString().slice(0, 10);
      saveAs(
        blob,
        `CoolStay_${selectedItem.item_name.replace(/\s+/g, "_")}_Inventory_${date}.pdf`,
      );
      toast.success("Item PDF downloaded.", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate item PDF", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSnapshot = async (report: ReportItem) => {
    try {
      const reportData = JSON.parse(report.report_content) as CurrentStockReportData;
      const blob = await pdf(<CurrentStockReport data={reportData} />).toBlob();
      const date = new Date(report.generated_at).toISOString().slice(0, 10);

      saveAs(
        blob,
        `CoolStay_Inventory_Snapshot_${date}.pdf`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to download this snapshot.");
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return toast.error("Please select an item.");

    const hasTransactions = history.length > 0;
    const confirmed = window.confirm(
      hasTransactions
        ? `Archive ${selectedItem.item_name}? Its transaction history and snapshots will be kept.`
        : `Delete ${selectedItem.item_name}? This item has no transaction history.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/inventory/${selectedItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to update item");

      toast.success(
        data.action === "archived" ? "Item archived." : "Item deleted.",
      );
      await fetchInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Item update failed");
    } finally {
      setIsDeleting(false);
    }
  };

  let runningBalance = itemTotals.opening;

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-slate-50 p-6 text-slate-800">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-lg bg-blue-50 p-2 text-blue-700">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#0A1A44]">
              Inventory Management
            </h1>
            <p className="text-sm text-slate-500">
              Track incoming and outgoing items with a full transaction history.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
          <button
            onClick={handleDownloadSelectedItem}
            disabled={isGenerating || !selectedItem}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Item PDF
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || items.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A1A44] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-950 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Save Snapshot
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr_330px]">
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-bold text-[#0A1A44]">Items</h2>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder="Search items"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="max-h-[460px] overflow-y-auto p-2">
            {loading ? (
              <div className="px-3 py-10 text-center text-sm text-slate-400">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading items...
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-slate-400">
                No inventory items yet.
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-slate-400">
                No items match your search.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                const isLowStock = item.current_stock <= item.minimum_stock;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {item.item_name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {item.category}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          isLowStock
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isLowStock ? "Low" : "OK"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Stock
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {item.current_stock}
                        <span className="ml-1 text-xs font-bold text-slate-500">
                          {item.unit}
                        </span>
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="p-5">
              <h2 className="mb-4 text-sm font-bold text-[#0A1A44]">
                Transaction Details
              </h2>
              <div className="mb-4 inline-grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
                <button
                  onClick={() => setTransactionType("restock")}
                  className={`rounded-md px-10 py-2 ${
                    transactionType === "restock"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600"
                  }`}
                >
                  IN
                </button>
                <button
                  onClick={() => setTransactionType("usage")}
                  className={`rounded-md px-10 py-2 ${
                    transactionType === "usage"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600"
                  }`}
                >
                  OUT
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Item" required>
                  <select
                    value={selectedItemId}
                    onChange={(event) => setSelectedItemId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {items.length === 0 && <option value="">No items</option>}
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity" required>
                  <div className="flex h-11 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Math.max(1, Number(event.target.value) || 1))
                      }
                      className="min-w-0 flex-1 px-3 text-sm font-medium outline-none"
                    />
                    <div className="flex w-16 items-center justify-center border-l border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                      {selectedItem?.unit || "pcs"}
                    </div>
                  </div>
                </Field>
                <Field label="Date & Time" required>
                  <input
                    type="datetime-local"
                    value={transactionDate}
                    onChange={(event) => setTransactionDate(event.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>
                <Field label="Remarks">
                  <input
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder={
                      transactionType === "usage"
                        ? "e.g. Issued to Room 201"
                        : "e.g. Checked in from Supplier A"
                    }
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleSaveTransaction}
                  disabled={submitting || loading || !selectedItem}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Transaction
                </button>
              </div>
          </div>
        </section>

        <aside>
          <section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-[#0A1A44]">
              Current Stock Summary
            </h2>
            <p className="text-xs font-bold uppercase text-slate-400">Item</p>
            <p className="mb-4 text-lg font-black text-slate-900">
              {selectedItem?.item_name || "No item selected"}
            </p>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold text-slate-600">Current Stock</p>
              <p className="mt-1 text-3xl font-black text-emerald-700">
                {selectedItem?.current_stock ?? 0}
                <span className="ml-1 text-sm">{selectedItem?.unit || "pcs"}</span>
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Based on all IN and OUT transactions
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
                <p className="text-xs font-bold text-emerald-700">Total IN</p>
                <p className="text-xl font-black text-emerald-700">
                  {itemTotals.stockIn}
                </p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
                <p className="text-xs font-bold text-red-700">Total OUT</p>
                <p className="text-xl font-black text-red-700">
                  {itemTotals.stockOut}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-600">
              Current Stock = Opening + Total IN - Total OUT
              <br />
              {selectedItem?.current_stock ?? 0} = {itemTotals.opening} +{" "}
              {itemTotals.stockIn} - {itemTotals.stockOut}
            </div>
            <button
              onClick={handleDeleteItem}
              disabled={!selectedItem || isDeleting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {history.length > 0 ? "Archive Item" : "Delete Item"}
            </button>
          </section>
        </aside>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0A1A44]">
              Selected Item Transaction History
            </h2>
            <p className="text-xs text-slate-500">
              Detailed history of all IN and OUT transactions for the selected
              item.
            </p>
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search this audit trail"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No transaction history found for this item.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((log, index) => {
                  const isIn = log.purpose === "Restock";
                  const qty = Number(log.quantity_used || 0);
                  runningBalance = isIn
                    ? runningBalance + qty
                    : runningBalance - qty;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {new Date(log.usage_date).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            isIn
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownCircle className="h-3 w-3" />
                          ) : (
                            <ArrowUpCircle className="h-3 w-3" />
                          )}
                          {isIn ? "IN" : "OUT"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {selectedItem?.item_name || "-"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          isIn ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {isIn ? "+" : "-"}
                        {qty} {selectedItem?.unit || ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                        {runningBalance} {selectedItem?.unit || ""}
                      </td>
                      <td className="min-w-64 px-4 py-3 text-slate-600">
                        {log.notes || "No remarks"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0A1A44]">
              Saved Inventory Snapshots
            </h2>
            <p className="text-xs text-slate-500">
              Stored PDF-ready snapshots for the full active inventory.
            </p>
          </div>
          <span className="text-xs font-bold uppercase text-slate-400">
            {reports.length} saved
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {reports.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              No inventory snapshots saved yet.
            </div>
          ) : (
            reports.map((report) => {
              let data: CurrentStockReportData | null = null;
              try {
                data = JSON.parse(report.report_content);
              } catch {
                data = null;
              }

              return (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-800">
                      {new Date(report.generated_at).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Items: {data?.summary.totalItems ?? 0} | Low stock:{" "}
                      {data?.summary.lowStockCount ?? 0} | IN:{" "}
                      {data?.summary.totalStockIn ?? 0} | OUT:{" "}
                      {data?.summary.totalStockOut ?? 0}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadSnapshot(report)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <AddSupplyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={fetchInventory}
      />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
