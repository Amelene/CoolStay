"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  AlertTriangle,
  Search,
  Loader2,
  Box,
  ArrowUpDown,
  History,
  Package,
} from "lucide-react";
import AddSupplyModal from "@/components/admin/inventory/AddSupplyModal";
import AdjustStockModal from "@/components/admin/inventory/AdjustStockModal";
import InventoryLogs from "@/components/admin/inventory/InventoryLogs";

type SupplyItem = {
  id: string;
  item_name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  last_restocked: string;
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "logs">("stock");
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<SupplyItem | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch (error) {
      console.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter Logic
  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Stats
  const lowStockCount = items.filter(
    (i) => i.current_stock <= i.minimum_stock,
  ).length;
  const totalItems = items.length;

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
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-[#0A1A44] hover:bg-blue-900 text-white px-5 py-3 rounded-full font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      {/* KPI Cards (Only show on Stock Tab) */}
      {activeTab === "stock" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Total Items
              </p>
              <p className="text-2xl font-bold text-slate-800">{totalItems}</p>
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
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "stock"
              ? "border-[#0A1A44] text-[#0A1A44]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Package className="w-4 h-4" /> Current Stock
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "logs"
              ? "border-[#0A1A44] text-[#0A1A44]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <History className="w-4 h-4" /> Usage History
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {activeTab === "stock" ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  placeholder="Search supplies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 p-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 ring-blue-100 outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
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
                        className="p-8 text-center text-slate-400"
                      >
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />{" "}
                        Loading...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-400"
                      >
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
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
                            <p className="text-[10px] text-slate-400">
                              ID: {item.id.substring(0, 6)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
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
                                  Low
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
        ) : (
          /* Logs View */
          <div className="p-6">
            <InventoryLogs />
          </div>
        )}
      </div>

      {/* Modals */}
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
