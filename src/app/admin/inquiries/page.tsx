"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Loader2,
  Mail,
  Phone,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
} from "lucide-react";

// Types matching your DB
interface Inquiry {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  event_type: string;
  preferred_date: string;
  guest_count: number;
  message: string;
  status: "new" | "contacted" | "booked" | "closed";
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInquiries = async () => {
    try {
      const res = await fetch("/api/admin/inquiries");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInquiries(data);
    } catch (error) {
      console.error(error);
      toast.error("Could not load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    // Optimistic Update
    setInquiries((prev) =>
      prev.map((item) =>
        // FIX: Cast to Inquiry['status'] instead of any
        item.id === id
          ? { ...item, status: newStatus as Inquiry["status"] }
          : item
      )
    );

    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) throw new Error("Update failed");
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
      fetchInquiries(); // Revert on error
    }
  };

  const filteredInquiries = inquiries.filter(
    (item) =>
      item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.event_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] -m-6 p-8 bg-[#F5F8FA] font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#0A1A44] tracking-tight">
            Event Inquiries
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Manage leads for weddings, corporate events, and parties.
          </p>
        </div>

        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A1A44]" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 opacity-50" />
            </div>
            <p>No inquiries found.</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Date Submitted
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Event Details
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    {/* Date */}
                    <td className="p-4 align-top text-sm font-medium text-slate-600 w-32">
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </td>

                    {/* Customer */}
                    <td className="p-4 align-top">
                      <div className="font-bold text-[#0A1A44]">
                        {inquiry.full_name}
                      </div>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> {inquiry.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {inquiry.phone}
                        </span>
                      </div>
                    </td>

                    {/* Event Details */}
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-blue-100">
                          {inquiry.event_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Target:{" "}
                          <span className="text-slate-800">
                            {new Date(
                              inquiry.preferred_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          Est. Pax:{" "}
                          <span className="text-slate-800">
                            {inquiry.guest_count}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Message */}
                    <td className="p-4 align-top">
                      <p className="text-sm text-slate-600 leading-relaxed max-w-xs line-clamp-3">
                        {inquiry.message || (
                          <span className="italic text-slate-400">
                            No additional notes provided.
                          </span>
                        )}
                      </p>
                    </td>

                    {/* Status & Actions */}
                    <td className="p-4 align-top w-40">
                      <div className="relative">
                        <select
                          value={inquiry.status}
                          onChange={(e) =>
                            handleStatusUpdate(inquiry.id, e.target.value)
                          }
                          className={`
                            appearance-none w-full pl-8 pr-8 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border focus:ring-2 focus:ring-offset-1 outline-none cursor-pointer transition-all
                            ${
                              inquiry.status === "new"
                                ? "bg-blue-50 border-blue-200 text-blue-700 focus:ring-blue-500"
                                : inquiry.status === "contacted"
                                ? "bg-yellow-50 border-yellow-200 text-yellow-700 focus:ring-yellow-500"
                                : inquiry.status === "booked"
                                ? "bg-green-50 border-green-200 text-green-700 focus:ring-green-500"
                                : "bg-slate-100 border-slate-200 text-slate-500 focus:ring-slate-400"
                            }
                          `}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="booked">Booked</option>
                          <option value="closed">Closed</option>
                        </select>

                        {/* Status Icon Overlay */}
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {inquiry.status === "new" && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          )}
                          {inquiry.status === "contacted" && (
                            <Clock className="w-3.5 h-3.5 text-yellow-600" />
                          )}
                          {inquiry.status === "booked" && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          )}
                          {inquiry.status === "closed" && (
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>

                        {/* Chevron Down */}
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
