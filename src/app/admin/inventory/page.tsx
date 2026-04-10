"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  AlertTriangle,
  Search,
  Loader2,
  Box,
  ArrowUpDown,
  History,
  Package,
  FileText,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import AddSupplyModal from "@/components/admin/inventory/AddSupplyModal";
import AdjustStockModal from "@/components/admin/inventory/AdjustStockModal";
import InventoryLogs from "@/components/admin/inventory/InventoryLogs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import CurrentStockReport, {
  CurrentStockReportData,
} from "@/components/pdf/CurrentStockReport";

// --- TYPES ---
type SupplyItem = {
  id: string;
  item_name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  last_restocked: string;
};

type ReportItem = {
  id: string;
  generated_at: string;
  report_content: string;
  created_by?: string;
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "logs" | "reports">(
    "stock",
  );
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // --- NEW: Advanced Filter & Sort States ---
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name-asc");

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<SupplyItem | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("analytics_reports")
      .select("id, generated_at, report_content")
      .eq("report_type", "Inventory Stock Snapshot")
      .order("generated_at", { ascending: false });

    if (data) setReports(data);
  };

  useEffect(() => {
    fetchInventory();
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Taking inventory snapshot...");

    try {
      const res = await fetch("/api/admin/inventory/report", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");

      toast.success("Snapshot saved to Reports tab!", { id: toastId });
      await fetchReports();
      setActiveTab("reports");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (
    content: string,
    id: string,
    date: string,
  ) => {
    setDownloadingId(id);
    try {
      const parsedData: CurrentStockReportData = JSON.parse(content);
      const blob = await pdf(<CurrentStockReport data={parsedData} />).toBlob();
      saveAs(
        blob,
        `Stock_Report_${new Date(date).toISOString().slice(0, 10)}.pdf`,
      );
      toast.success("Download started");
    } catch (error) {
      console.error(error);
      toast.error("Error downloading file");
    } finally {
      setDownloadingId(null);
    }
  };

  // --- NEW: Dynamic Categories Extraction ---
  const categories = useMemo(() => {
    const cats = items.map((item) => item.category);
    return ["All", ...Array.from(new Set(cats))];
  }, [items]);

  // --- NEW: High-Performance Filter & Sort Pipeline ---
  const processedItems = useMemo(() => {
    let result = [...items];

    // 1. Apply Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.item_name.toLowerCase().includes(lowerSearch) ||
          item.category.toLowerCase().includes(lowerSearch),
      );
    }

    // 2. Apply Category Filter
    if (selectedCategory !== "All") {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // 3. Apply Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.item_name.localeCompare(b.item_name);
        case "name-desc":
          return b.item_name.localeCompare(a.item_name);
        case "stock-asc":
          return a.current_stock - b.current_stock;
        case "stock-desc":
          return b.current_stock - a.current_stock;
        default:
          return 0;
      }
    });

    return result;
  }, [items, search, selectedCategory, sortBy]);

  const lowStockCount = items.filter(
    (i) => i.current_stock <= i.minimum_stock,
  ).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F0F8FF] p-8 -m-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            Inventory Management
          </h1>
          <p className="text-slate-500 text-sm">
            Track daily supplies, toiletries, and cleaning kits.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#0A1A44] hover:bg-blue-900 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Item
          </button>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Total Items
            </p>
            <p className="text-2xl font-bold text-slate-800">{items.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${lowStockCount > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Low Stock Alerts
            </p>
            <p
              className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : "text-slate-800"}`}
            >
              {lowStockCount}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Saved Reports
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {reports.length}
            </p>
          </div>
        </div>
      </div>
      min-h-125
      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-6 bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === "stock" ? "bg-[#0A1A44] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
        >
          <Package className="w-4 h-4" /> Current Stock
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === "logs" ? "bg-[#0A1A44] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
        >
          <History className="w-4 h-4" /> Usage History
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${activeTab === "reports" ? "bg-[#0A1A44] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
        >
          <FileText className="w-4 h-4" /> Saved Reports
        </button>
      </div>
      {/* --- CONTENT AREA --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-125">
        {/* TAB 1: CURRENT STOCK */}
        {activeTab === "stock" && (
          <>
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50/50">
              {/* --- NEW: Advanced Control Panel --- */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:min-w-62.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    placeholder="Search supplies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative flex-1 sm:min-w-45 flex items-center">
                  <Filter className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm cursor-pointer appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sorting */}
                <div className="relative flex-1 sm:min-w-45 flex items-center">
                  <ArrowUpDown className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm cursor-pointer appearance-none"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="stock-asc">Stock (Low to High)</option>
                    <option value="stock-desc">Stock (High to Low)</option>
                  </select>
                </div>
              </div>

              {/* SNAPSHOT BUTTON */}
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Save Snapshot
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Stock Level</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-12 text-center text-slate-400"
                      >
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        Loading inventory...
                      </td>
                    </tr>
                  ) : processedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-16 text-center">
                        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold">
                          No items found.
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          Try adjusting your search or filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    processedItems.map((item) => {
                      const isLow = item.current_stock <= item.minimum_stock;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700">
                              {item.item_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: {item.id.substring(0, 6)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-lg font-bold ${isLow ? "text-red-600" : "text-slate-700"}`}
                              >
                                {item.current_stock}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                {item.unit}
                              </span>
                              {isLow && (
                                <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                  Low Stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setAdjustItem(item)}
                              className="bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2 ml-auto"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" /> Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 2 & 3 remain completely unchanged */}
        {activeTab === "logs" && (
          <div className="p-6">
            <InventoryLogs />
          </div>
        )}

        {activeTab === "reports" && (
          <div className="p-6">
            {/* Same report render logic as before... */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0A1A44]">
                  Saved Snapshots
                </h3>
                <p className="text-sm text-slate-500">
                  Historical records of inventory levels.
                </p>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">
                  No reports saved yet.
                </p>
                <button
                  onClick={() => setActiveTab("stock")}
                  className="text-blue-600 text-sm font-bold hover:underline mt-2"
                >
                  Go to Stock to create one
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => {
                  let stats = { totalItems: 0, lowStockCount: 0 };
                  try {
                    const parsed = JSON.parse(report.report_content);
                    stats = parsed.summary || stats;
                  } catch (e) {
                    console.error("JSON Parse error", e);
                  }

                  return (
                    <div
                      key={report.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col justify-between h-full"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            SNAPSHOT
                          </span>
                        </div>

                        <h4 className="font-bold text-[#0A1A44] text-lg mb-1">
                          {new Date(report.generated_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {new Date(report.generated_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>

                        <div className="flex gap-4 mb-4 text-sm">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              Items
                            </p>
                            <p className="font-bold text-slate-700">
                              {stats.totalItems}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              Low Stock
                            </p>
                            <div className="flex items-center gap-1">
                              <p
                                className={`font-bold ${stats.lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}
                              >
                                {stats.lowStockCount}
                              </p>
                              {stats.lowStockCount > 0 && (
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleDownloadReport(
                            report.report_content,
                            report.id,
                            report.generated_at,
                          )
                        }
                        disabled={downloadingId === report.id}
                        className="w-full mt-4 bg-slate-50 hover:bg-[#0A1A44] hover:text-white text-slate-600 border border-slate-200 hover:border-[#0A1A44] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {downloadingId === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-4 h-4" /> Download PDF
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <AddSupplyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={fetchInventory}
      />
      <AdjustStockModal
        isOpen={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSuccess={fetchInventory}
      />
    </div>
  );
}
