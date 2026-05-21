"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import InventoryReport from "@/components/pdf/InventoryReport";

interface Log {
  id: string;
  usage_date: string;
  purpose: string;
  quantity_used: number;
  used_by: string;
  notes: string;
  inventory_supplies: { item_name: string; unit: string } | null;
  room_inventory: { room_number: string } | null;
}

export default function InventoryLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/inventory/logs");
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const isIn = log.purpose === "Restock";
      const action = isIn ? "stock in restock received" : "stock out used issued";
      const timestamp = new Date(log.usage_date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const haystack = [
        log.inventory_supplies?.item_name || "Deleted Item",
        log.inventory_supplies?.unit || "",
        log.used_by || "",
        log.notes || "",
        log.purpose || "",
        action,
        String(log.quantity_used),
        timestamp,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesAction =
        actionFilter === "all"
          ? true
          : actionFilter === "in"
            ? isIn
            : !isIn;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const totals = useMemo(() => {
    const stockIn = filteredLogs.reduce(
      (sum, log) =>
        log.purpose === "Restock" ? sum + Number(log.quantity_used || 0) : sum,
      0,
    );
    const stockOut = filteredLogs.reduce(
      (sum, log) =>
        log.purpose === "Restock" ? sum : sum + Number(log.quantity_used || 0),
      0,
    );
    const uniqueItems = new Set(
      filteredLogs.map((log) => log.inventory_supplies?.item_name).filter(Boolean),
    ).size;

    return {
      entries: filteredLogs.length,
      stockIn,
      stockOut,
      uniqueItems,
    };
  }, [filteredLogs]);

  const actionLabel =
    actionFilter === "in"
      ? "Stock In Only"
      : actionFilter === "out"
        ? "Stock Out Only"
        : "All Movements";

  const reportFilters = {
    search: searchTerm.trim() || undefined,
    action: actionLabel,
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-400">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
        Loading movement ledger...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0A1A44]">Movement Ledger</h2>
          <p className="text-sm text-slate-500">
            Chronological stock in and stock out records across all inventory
            items.
          </p>
        </div>
        <PDFDownloadLink
          document={
            <InventoryReport
              logs={filteredLogs}
              generatedBy="Admin"
              filters={reportFilters}
            />
          }
          fileName={`CoolStay_Inventory_Movement_Ledger_${new Date().toISOString().split("T")[0]}.pdf`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A1A44] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
        >
          {({ loading }) =>
            loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Ledger PDF
              </>
            )
          }
        </PDFDownloadLink>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <LedgerMetric label="Entries" value={totals.entries} />
        <LedgerMetric label="Stock In" value={`+${totals.stockIn}`} tone="in" />
        <LedgerMetric label="Stock Out" value={`-${totals.stockOut}`} tone="out" />
        <LedgerMetric label="Items Moved" value={totals.uniqueItems} tone="blue" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search item, remarks, user, quantity, or date"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="relative lg:w-52">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-bold text-slate-600 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Movements</option>
            <option value="in">Stock In Only</option>
            <option value="out">Stock Out Only</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Movement</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3">Remarks</th>
                <th className="px-5 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No stock movements have been recorded yet.
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No ledger entries match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isIn = log.purpose === "Restock";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        <p className="font-medium">
                          {new Date(log.usage_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(log.usage_date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="min-w-48 px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {log.inventory_supplies?.item_name || "Deleted Item"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Unit: {log.inventory_supplies?.unit || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
                            isIn
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {isIn ? (
                            <ArrowUpCircle className="h-3 w-3" />
                          ) : (
                            <ArrowDownCircle className="h-3 w-3" />
                          )}
                          {isIn ? "Stock In" : "Stock Out"}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          isIn ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {isIn ? "+" : "-"}
                        {log.quantity_used}
                      </td>
                      <td
                        className="min-w-64 max-w-96 px-5 py-4 text-slate-600"
                        title={log.notes}
                      >
                        {log.notes || "No remarks"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">
                        {log.used_by || "Admin"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LedgerMetric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "in" | "out" | "blue";
}) {
  const toneMap = {
    slate: "bg-slate-50 text-slate-800 border-slate-200",
    in: "bg-emerald-50 text-emerald-700 border-emerald-100",
    out: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <div className={`rounded-lg border p-4 ${toneMap[tone]}`}>
      <p className="text-[10px] font-bold uppercase opacity-70">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
