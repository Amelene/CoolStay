"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
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

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading
        logs...
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Report Button */}
      <div className="flex justify-end">
        <PDFDownloadLink
          document={<InventoryReport logs={logs} generatedBy="Admin" />}
          fileName={`Inventory_Report_${new Date().toISOString().split("T")[0]}.pdf`}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all"
        >
          {({ loading }) =>
            loading ? (
              "Preparing..."
            ) : (
              <>
                <Download className="w-4 h-4" /> Download PDF Report
              </>
            )
          }
        </PDFDownloadLink>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Qty</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Performed By</th>
              <th className="px-6 py-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No history found.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isRestock = log.purpose === "Restock";
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.usage_date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {log.inventory_supplies?.item_name || "Deleted Item"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase w-fit ${
                          isRestock
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {isRestock ? (
                          <ArrowUpCircle className="w-3 h-3" />
                        ) : (
                          <ArrowDownCircle className="w-3 h-3" />
                        )}
                        {isRestock ? "Restock" : "Used"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      {log.quantity_used}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {log.room_inventory?.room_number ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                          Room {log.room_inventory.room_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          General / Stockroom
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {log.used_by}
                    </td>
                    <td
                      className="px-6 py-4 text-slate-500 max-w-[200px] truncate"
                      title={log.notes}
                    >
                      {log.notes}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
