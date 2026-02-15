"use client";

import { useEffect, useState } from "react";
import {
  Search,
  CreditCard,
  History,
  Phone,
  Mail,
  User,
  Loader2,
  LucideIcon,
  Crown,
  Gem,
  ChevronRight,
  Building2,
  ArrowUpRight,
  MapPin,
} from "lucide-react";

// --- TYPES ---
interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  role: string;
}

interface CustomerBooking {
  id: string;
  created_at: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  guests_count: number;
  room_types: {
    name: string;
    image_url: string;
  } | null;
}

interface StatBoxProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorTheme: "green" | "blue" | "purple";
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>(
    []
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch List
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch("/api/admin/customers");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // 2. Fetch Details when selected
  useEffect(() => {
    if (!selectedCustomer) return;

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();
        setCustomerBookings(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedCustomer]);

  // Derived Stats
  const totalSpent = customerBookings.reduce(
    (sum, b) => sum + (b.status !== "cancelled" ? b.total_amount : 0),
    0
  );
  const totalStays = customerBookings.filter(
    (b) => b.status === "checked_out" || b.status === "confirmed"
  ).length;

  // Tier Calculation
  const getTier = (spend: number) => {
    if (spend >= 50000)
      return {
        name: "VIP Gold",
        icon: Crown,
        style: "bg-yellow-400 text-[#0A1A44] border-yellow-400",
      };
    if (spend >= 20000)
      return {
        name: "Silver",
        icon: Gem,
        style: "bg-slate-300 text-slate-800 border-slate-300",
      };
    return {
      name: "Member",
      icon: User,
      style: "bg-white/10 text-white border-white/20",
    };
  };

  const tier = getTier(totalSpent);

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] -m-6 p-8 bg-[#F5F8FA] font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#0A1A44] tracking-tight">
            Guest Directory
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Manage profiles & history
          </p>
        </div>

        {/* Search */}
        <div className="relative w-80 group">
          <div className="absolute -inset-0.5 bg-linear-to-r from-blue-200 to-indigo-200 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-200" />
          <div className="relative flex items-center bg-white rounded-xl shadow-sm border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="Find a guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-4 py-2.5 bg-transparent border-none outline-none text-sm font-medium text-[#0A1A44]"
            />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* LEFT: Guest List */}
        <div className="w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 pb-20 custom-scrollbar">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-white rounded-2xl animate-pulse shadow-sm"
              />
            ))
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
              No guests found.
            </div>
          ) : (
            filteredCustomers.map((guest) => (
              <div
                key={guest.id}
                onClick={() => setSelectedCustomer(guest)}
                className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border flex items-center justify-between overflow-hidden ${
                  selectedCustomer?.id === guest.id
                    ? "bg-[#0A1A44] text-white border-[#0A1A44] shadow-lg shadow-blue-900/20 scale-[1.02]"
                    : "bg-white text-slate-700 border-white hover:border-blue-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                      selectedCustomer?.id === guest.id
                        ? "bg-white/10 text-white backdrop-blur-sm"
                        : "bg-slate-100 text-[#0A1A44]"
                    }`}
                  >
                    {guest.full_name?.charAt(0) || "G"}
                  </div>
                  <div>
                    <h3
                      className={`font-bold text-sm leading-tight ${
                        selectedCustomer?.id === guest.id
                          ? "text-white"
                          : "text-[#0A1A44]"
                      }`}
                    >
                      {guest.full_name}
                    </h3>
                    <p
                      className={`text-xs mt-0.5 font-medium ${
                        selectedCustomer?.id === guest.id
                          ? "text-blue-200"
                          : "text-slate-400"
                      }`}
                    >
                      {guest.email}
                    </p>
                  </div>
                </div>

                {selectedCustomer?.id === guest.id && (
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-[#0A1A44] to-transparent pointer-events-none" />
                )}
                <ChevronRight
                  className={`w-4 h-4 relative z-10 ${
                    selectedCustomer?.id === guest.id
                      ? "text-white"
                      : "text-slate-300 group-hover:text-[#0A1A44]"
                  }`}
                />
              </div>
            ))
          )}
        </div>

        {/* RIGHT: Details Panel */}
        <div className="flex-1 bg-white rounded-4xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col relative">
          {selectedCustomer ? (
            <>
              {/* 1. Brand Header */}
              <div className="relative bg-[#0A1A44] p-8 text-white overflow-hidden shrink-0">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20 -mr-16 -mt-32 pointer-events-none"></div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-2xl">
                      <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-3xl font-serif font-bold text-[#0A1A44]">
                        {selectedCustomer.full_name?.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-serif font-bold tracking-wide">
                        {selectedCustomer.full_name}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-blue-100/80 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />{" "}
                          {selectedCustomer.email}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-blue-400/50"></span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />{" "}
                          {selectedCustomer.phone || "No Phone"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 shadow-lg ${tier.style}`}
                  >
                    <tier.icon className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {tier.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Stats Bar (Tinted) */}
              <div className="grid grid-cols-3 gap-6 p-8 pb-0">
                <StatBox
                  label="Lifetime Value"
                  value={`₱${totalSpent.toLocaleString()}`}
                  icon={CreditCard}
                  colorTheme="green"
                />
                <StatBox
                  label="Total Journeys"
                  value={totalStays}
                  icon={Building2}
                  colorTheme="blue"
                />
                <StatBox
                  label="Avg. Spend"
                  value={
                    totalStays > 0
                      ? `₱${Math.round(
                          totalSpent / totalStays
                        ).toLocaleString()}`
                      : "-"
                  }
                  icon={ArrowUpRight}
                  colorTheme="purple"
                />
              </div>

              {/* 3. History Feed */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <History className="w-4 h-4" /> Recent Stays
                </h3>

                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0A1A44]" />
                      <span className="text-xs font-bold uppercase tracking-wide">
                        Syncing records...
                      </span>
                    </div>
                  ) : customerBookings.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center text-slate-400 text-sm">
                      No booking history found.
                    </div>
                  ) : (
                    customerBookings.map((booking) => {
                      const statusColor =
                        {
                          confirmed: "bg-green-500",
                          pending: "bg-yellow-400",
                          cancelled: "bg-red-400",
                          checked_in: "bg-blue-500",
                          checked_out: "bg-slate-400",
                        }[booking.status] || "bg-slate-300";

                      return (
                        <div
                          key={booking.id}
                          className="relative bg-white rounded-2xl p-4 pl-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group overflow-hidden"
                        >
                          {/* Colored Spine */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusColor}`}
                          />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="text-center min-w-14 py-1 bg-slate-50 rounded-lg">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                  {new Date(
                                    booking.check_in_date
                                  ).toLocaleDateString(undefined, {
                                    month: "short",
                                  })}
                                </div>
                                <div className="text-xl font-black text-[#0A1A44] leading-none my-0.5">
                                  {new Date(booking.check_in_date).getDate()}
                                </div>
                                <div className="text-[10px] font-bold text-slate-300">
                                  {new Date(
                                    booking.check_in_date
                                  ).getFullYear()}
                                </div>
                              </div>

                              <div>
                                <div className="font-bold text-[#0A1A44] text-base group-hover:text-blue-700 transition-colors">
                                  {booking.room_types?.name || "Room Stay"}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />{" "}
                                    {booking.guests_count} Guests
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                                      booking.status === "confirmed"
                                        ? "bg-green-50 text-green-700"
                                        : booking.status === "cancelled"
                                        ? "bg-red-50 text-red-600"
                                        : "bg-blue-50 text-blue-700"
                                    }`}
                                  >
                                    {booking.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-mono font-bold text-[#0A1A44] text-lg">
                                ₱{booking.total_amount.toLocaleString()}
                              </div>
                              <div className="text-[10px] font-bold text-slate-300 uppercase">
                                Total
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
              <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <User className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#0A1A44]">
                Guest Profiles
              </h3>
              <p className="text-sm font-medium text-center mt-2 max-w-xs">
                Select a guest from the directory to view their full profile,
                loyalty status, and history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT ---

function StatBox({ label, value, icon: Icon, colorTheme }: StatBoxProps) {
  const themes = {
    green: "bg-emerald-50 text-emerald-900 icon-emerald",
    blue: "bg-blue-50 text-blue-900 icon-blue",
    purple: "bg-purple-50 text-purple-900 icon-purple",
  };

  const theme = themes[colorTheme];

  return (
    <div className={`p-5 rounded-2xl flex items-center gap-4 ${theme}`}>
      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 opacity-80" />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-[10px] font-bold uppercase opacity-60 tracking-wider">
          {label}
        </div>
      </div>
    </div>
  );
}
