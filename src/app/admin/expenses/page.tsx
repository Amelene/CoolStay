"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Receipt,
  Image as ImageIcon,
  TrendingDown,
  FileText,
} from "lucide-react";
import AddExpenseModal from "@/components/admin/expenses/AddExpenseModal";

// Types matching your API response
type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  receipt_url: string | null;
  users?: { full_name: string };
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Quick KPI Math
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate top category
  const categoryTotals = expenses.reduce(
    (acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "None";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F0F8FF] p-8 -m-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0A1A44]">
            Expense Ledger
          </h1>
          <p className="text-slate-500 text-sm">
            Track operational costs and upload receipts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A1A44] hover:bg-blue-900 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Log Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Total Logged
            </p>
            <p className="text-2xl font-bold text-slate-800">
              ₱{totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Top Expense Area
            </p>
            <p className="text-xl font-bold text-slate-800">{topCategory}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Total Records
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {expenses.length}
            </p>
          </div>
        </div>
      </div>

      {/* The Datatable */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category & Desc</th>
                <th className="px-6 py-4">Recorded By</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading ledger...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Receipt className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold">
                      No expenses logged yet.
                    </p>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {new Date(exp.expense_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 inline-block">
                        {exp.category}
                      </span>
                      <p className="font-bold text-slate-800">
                        {exp.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {exp.users?.full_name || "Unknown Admin"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-red-600">
                        - ₱
                        {exp.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {exp.receipt_url ? (
                        <a
                          href={exp.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="View Receipt"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
