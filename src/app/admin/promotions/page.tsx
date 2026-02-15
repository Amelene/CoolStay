"use client";

import React, { useEffect, useState } from "react";
import {
  Ticket,
  Calendar,
  Plus,
  Copy,
  MoreVertical,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner"; // Import

type Promotion = {
  id: string;
  code: string;
  name: string;
  discount_value: number;
  discount_type: "percentage" | "fixed";
  valid_until: string | null;
  status: "active" | "expired" | "scheduled" | "disabled";
  usage_count: number;
};

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: string;
    valid_until: string;
  }>({
    name: "",
    code: "",
    discount_type: "percentage",
    discount_value: "",
    valid_until: "",
  });

  const fetchPromos = async () => {
    try {
      const res = await fetch("/api/admin/promotions");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPromos(data);
    } catch (error) {
      console.error("Error fetching promos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Creating promotion...");

    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create");

      await fetchPromos();
      setIsModalOpen(false);
      setFormData({
        name: "",
        code: "",
        discount_type: "percentage",
        discount_value: "",
        valid_until: "",
      });
      toast.dismiss(toastId);
      toast.success("Promotion created successfully!");
    } catch (error) {
      console.error("Error creating promotion:", error);
      toast.dismiss(toastId);
      toast.error("Error creating promotion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... (Rest of the file structure remains exactly the same)
  // Just returning the full component render for completeness
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F8FA] p-8 -m-6 font-sans relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-black">
            Promotions & Deals
          </h1>
          <p className="text-slate-600 font-medium mt-1">
            Manage coupons and special offers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A1A44] hover:bg-[#1a3a75] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Create New Promo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        {isLoading ? (
          <div className="col-span-full text-center text-slate-500 animate-pulse">
            Loading promotions...
          </div>
        ) : promos.length === 0 ? (
          <div className="col-span-full text-center text-slate-500 py-10">
            No active promotions found. Create one to get started!
          </div>
        ) : (
          promos.map((promo) => (
            <div
              key={promo.id}
              className="group relative flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-40 border border-blue-100"
            >
              <div
                className={`w-32 flex flex-col items-center justify-center text-white p-4 relative
                ${
                  promo.discount_type === "percentage"
                    ? "bg-blue-600"
                    : "bg-[#0A1A44]"
                }`}
              >
                <div className="absolute -right-3 top-0 w-6 h-6 bg-[#cde4fa] rounded-full"></div>
                <div className="absolute -right-3 bottom-0 w-6 h-6 bg-[#cde4fa] rounded-full"></div>

                <span className="text-3xl font-serif font-bold">
                  {promo.discount_type === "percentage"
                    ? `${promo.discount_value}%`
                    : `₱${promo.discount_value}`}
                </span>
                <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1">
                  OFF
                </span>
              </div>

              <div className="w-0 border-l-2 border-dashed border-gray-200 relative my-3"></div>

              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                          ${
                            promo.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                    >
                      {promo.status}
                    </span>
                    <MoreVertical className="w-4 h-4 text-gray-300 cursor-pointer" />
                  </div>
                  <h3 className="font-bold text-[#0A1A44] text-lg mt-2 truncate">
                    {promo.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {promo.valid_until
                      ? new Date(promo.valid_until).toLocaleDateString()
                      : "No Expiry"}
                  </p>
                </div>

                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-slate-400" />
                    <span className="font-mono font-bold text-slate-700 tracking-wider">
                      {promo.code}
                    </span>
                  </div>
                  <Copy
                    className="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      navigator.clipboard.writeText(promo.code);
                      toast.success("Code copied to clipboard!");
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#0A1A44]">
                Create New Promotion
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Campaign Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Summer Sale"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Promo Code
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g., SUMMER2025"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as "percentage" | "fixed",
                      })
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₱)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Value
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="20"
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_value: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.valid_until}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_until: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0A1A44] hover:bg-[#1a3a75] text-white font-bold py-4 rounded-xl mt-4 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Create Promotion"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
