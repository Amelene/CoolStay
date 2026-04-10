"use client";

import React, { useEffect, useState } from "react";
import {
  Ticket,
  Calendar,
  Plus,
  Copy,
  X,
  Loader2,
  Power,
  PowerOff,
  Trash2,
  Users,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

type Promotion = {
  id: string;
  code: string;
  name: string;
  discount_value: number;
  discount_type: "percentage" | "fixed";
  min_spend: number;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string | null;
  status: "active" | "expired" | "scheduled" | "disabled";
};

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_spend: "",
    usage_limit: "",
    valid_from: new Date().toISOString().split("T")[0],
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
      toast.error("Failed to load promotions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔒 FRONTEND GUARDRAIL
    if (
      formData.discount_type === "percentage" &&
      Number(formData.discount_value) > 100
    ) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating promotion...");

    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      await fetchPromos();
      setIsModalOpen(false);
      setFormData({
        name: "",
        code: "",
        discount_type: "percentage",
        discount_value: "",
        min_spend: "",
        usage_limit: "",
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: "",
      });
      toast.dismiss(toastId);
      toast.success("Promotion created successfully!");
    } catch (error: unknown) {
      toast.dismiss(toastId);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "disabled" ? "active" : "disabled";
    const toastId = toast.loading(
      `${newStatus === "disabled" ? "Disabling" : "Enabling"} promo...`,
    );
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchPromos();
      toast.dismiss(toastId);
      toast.success(`Promo ${newStatus}!`);
    } catch (error) {
      console.error("Status toggle error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to update promo status");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this promo code? This will not affect past bookings that used it.",
      )
    )
      return;

    const toastId = toast.loading("Deleting promo...");
    try {
      const res = await fetch(`/api/admin/promotions?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchPromos();
      toast.dismiss(toastId);
      toast.success("Promo deleted!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.dismiss(toastId);
      toast.error("Failed to delete promo");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F8FA] p-8 -m-6 font-sans relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-black">
            Promotions & Deals
          </h1>
          <p className="text-slate-600 font-medium mt-1">
            Manage marketing campaigns, limits, and rules.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A1A44] hover:bg-[#1a3a75] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
        >
          <Plus className="w-5 h-5" /> Create New Promo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        {isLoading ? (
          <div className="col-span-full text-center text-slate-500 animate-pulse">
            Loading promotions...
          </div>
        ) : promos.length === 0 ? (
          <div className="col-span-full text-center text-slate-500 py-10 bg-white rounded-xl border border-dashed border-gray-300">
            No active promotions found. Create one to get started!
          </div>
        ) : (
          promos.map((promo) => {
            const isPercentage = promo.discount_type === "percentage";
            const isDepleted =
              promo.usage_limit && promo.usage_count >= promo.usage_limit;
            const isExpired =
              promo.valid_until && new Date(promo.valid_until) < new Date();

            // Dynamic Status display
            let displayStatus: string = promo.status;
            if (displayStatus === "active") {
              if (isDepleted) displayStatus = "depleted";
              else if (isExpired) displayStatus = "expired";
            }

            return (
              <div
                key={promo.id}
                className={`group relative flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all h-48 border ${displayStatus === "active" ? "border-blue-200" : "border-gray-200 opacity-75"}`}
              >
                {/* Left Ticket Stub */}
                <div
                  className={`w-32 flex flex-col items-center justify-center text-white p-4 relative ${
                    displayStatus !== "active"
                      ? "bg-gray-400"
                      : isPercentage
                        ? "bg-blue-600"
                        : "bg-[#0A1A44]"
                  }`}
                >
                  <div className="absolute -right-3 top-0 w-6 h-6 bg-[#F5F8FA] rounded-full"></div>
                  <div className="absolute -right-3 bottom-0 w-6 h-6 bg-[#F5F8FA] rounded-full"></div>

                  <span className="text-3xl font-serif font-bold">
                    {isPercentage
                      ? `${promo.discount_value}%`
                      : `₱${promo.discount_value}`}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1">
                    OFF
                  </span>
                </div>

                <div className="w-0 border-l-2 border-dashed border-gray-200 relative my-3"></div>

                {/* Right Content */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          displayStatus === "active"
                            ? "bg-green-100 text-green-700"
                            : displayStatus === "disabled"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {displayStatus}
                      </span>

                      <div className="flex gap-2">
                        {/* Kill Switch */}
                        <button
                          onClick={() =>
                            handleToggleStatus(promo.id, promo.status)
                          }
                          title={
                            promo.status === "disabled"
                              ? "Enable Promo"
                              : "Disable Promo"
                          }
                        >
                          {promo.status === "disabled" ? (
                            <Power className="w-4 h-4 text-green-500 hover:scale-110" />
                          ) : (
                            <PowerOff className="w-4 h-4 text-orange-500 hover:scale-110" />
                          )}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(promo.id)}
                          title="Delete Promo"
                        >
                          <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500 hover:scale-110 transition-colors" />
                        </button>
                      </div>
                    </div>

                    <h3
                      className="font-bold text-[#0A1A44] text-md mt-1 truncate"
                      title={promo.name}
                    >
                      {promo.name}
                    </h3>

                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{" "}
                        {promo.valid_until
                          ? new Date(promo.valid_until).toLocaleDateString()
                          : "No Expiry"}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {promo.usage_count} /{" "}
                        {promo.usage_limit || "∞"} Used
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 col-span-2">
                        <DollarSign className="w-3 h-3" /> Min Spend: ₱
                        {promo.min_spend.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2 border border-slate-100 mt-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-slate-400" />
                      <span className="font-mono font-bold text-slate-700 tracking-wider text-sm">
                        {promo.code}
                      </span>
                    </div>
                    <Copy
                      className="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-600"
                      onClick={() => {
                        navigator.clipboard.writeText(promo.code);
                        toast.success("Copied!");
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-slate-50">
              <h3 className="text-xl font-bold text-[#0A1A44]">
                Create Marketing Rule
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Campaign Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Summer Blowout 2026"
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Promo Code <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., SUMMER2026"
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 uppercase font-mono tracking-widest text-lg font-bold text-[#0A1A44]"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.replace(/\s/g, "").toUpperCase(),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Type <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Value <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={
                      formData.discount_type === "percentage"
                        ? "100"
                        : undefined
                    }
                    placeholder={
                      formData.discount_type === "percentage"
                        ? "e.g., 20"
                        : "e.g., 1000"
                    }
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_value: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Min. Spend (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={formData.min_spend}
                    onChange={(e) =>
                      setFormData({ ...formData, min_spend: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Usage Limit (Pax)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Optional"
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={formData.usage_limit}
                    onChange={(e) =>
                      setFormData({ ...formData, usage_limit: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Valid From <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={formData.valid_from}
                    onChange={(e) =>
                      setFormData({ ...formData, valid_from: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    className="w-full p-2.5 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={formData.valid_until}
                    onChange={(e) =>
                      setFormData({ ...formData, valid_until: e.target.value })
                    }
                  />
                  <span className="text-[9px] text-gray-400">
                    Leave blank for no expiration
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0A1A44] hover:bg-[#1a3a75] text-white font-bold py-3.5 rounded-xl mt-6 flex justify-center items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Publish Campaign"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
