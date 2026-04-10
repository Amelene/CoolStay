"use client";

import { useState } from "react";
import { X, Loader2, UploadCloud, Receipt } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  "Utilities",
  "Payroll",
  "Maintenance",
  "Supplies",
  "Marketing",
  "Other",
];

// Helper: Convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("Failed to convert file"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Utilities");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !file) {
      toast.error("Please fill in all required fields and attach a receipt");
      return;
    }

    setLoading(true);
    // FIX: Changed from `let` to `const` to satisfy ESLint
    const toastId = toast.loading("Verifying receipt with AI...");

    try {
      // 🛡️ STEP 1: AI GATEKEEPER
      const base64Image = await fileToBase64(file);
      const aiRes = await fetch("/api/admin/expenses/verify-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image,
          mimeType: file.type,
        }),
      });

      if (!aiRes.ok) throw new Error("AI Verification service is down");
      const aiDecision = await aiRes.json();

      if (!aiDecision.is_valid) {
        toast.error(
          aiDecision.rejection_reason || "Invalid receipt detected.",
          { id: toastId },
        );
        setLoading(false);
        return; // Halt the upload process!
      }

      toast.loading("Uploading to secure vault...", { id: toastId });

      // ☁️ STEP 2: SUPABASE UPLOAD (Only runs if AI approves)
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("expense-receipts")
        .upload(fileName, file);

      if (uploadError)
        throw new Error(
          "Failed to upload receipt image. Check Storage Policies.",
        );

      const { data: publicUrlData } = supabase.storage
        .from("expense-receipts")
        .getPublicUrl(fileName);

      const receipt_url = publicUrlData.publicUrl;

      toast.loading("Saving ledger record...", { id: toastId });

      // 💾 STEP 3: DATABASE INSERT
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          category,
          description,
          expense_date: expenseDate,
          receipt_url,
        }),
      });

      if (!res.ok) throw new Error("Failed to save expense");

      toast.success("Expense logged successfully!", { id: toastId });

      setAmount("");
      setDescription("");
      setFile(null);

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Log New Expense
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Amount (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="e.g. Meralco Bill for April"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Receipt Image <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors relative cursor-pointer ${file ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud
                className={`w-6 h-6 mx-auto mb-2 ${file ? "text-blue-500" : "text-slate-400"}`}
              />
              <p
                className={`text-xs font-medium ${file ? "text-blue-700" : "text-slate-500"}`}
              >
                {file ? file.name : "Click or drag to upload receipt"}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A1A44] hover:bg-blue-900 text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Verify & Save Expense"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
