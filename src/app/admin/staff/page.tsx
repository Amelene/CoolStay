"use client";

import React, { useEffect, useState } from "react";
import StaffModal from "@/components/admin/StaffModal";
import {
  Plus,
  Trash2,
  Edit2,
  Briefcase,
  Mail,
  Phone,
  Search,
  BadgeCheck,
  Ban,
  Users,
  Building2,
  Wallet,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner"; // Import

// --- TYPES ---
interface StaffMember {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  salary: number;
  hire_date: string;
}

// --- STATS COMPONENT ---
function StatBadge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4 flex-1 min-w-[150px]">
      <div
        className={`p-3 rounded-xl ${color} text-white shadow-lg transform -rotate-3`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-2xl font-serif font-bold text-[#0A1A44]">{value}</p>
      </div>
    </div>
  );
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStaffList(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // --- HANDLERS ---

  const handleAdd = () => {
    setStaffToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (staff: StaffMember) => {
    setStaffToEdit(staff);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to remove this staff member? This action cannot be undone."
      )
    )
      return;

    const toastId = toast.loading("Deleting staff member...");

    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }

      // Optimistic update
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      toast.dismiss(toastId);
      toast.success("Staff member removed successfully");
    } catch (error: unknown) {
      toast.dismiss(toastId);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred");
      }
    }
  };

  // --- FILTERS & STATS ---
  const filteredStaff = staffList.filter(
    (staff) =>
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === "active").length;
  const totalDepartments = new Set(staffList.map((s) => s.department)).size;
  const monthlyPayroll = staffList.reduce(
    (acc, curr) => acc + (curr.salary || 0),
    0
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-8 -m-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* 1. Header & Stats */}
      <div className="flex flex-col gap-8 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-serif font-black text-[#0A1A44] tracking-tight">
              Workforce
            </h1>
            <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
              Manage your most valuable assets.
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="group bg-[#0A1A44] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-900 transition-all shadow-lg hover:shadow-[#0A1A44]/20 hover:-translate-y-1 flex items-center gap-3"
          >
            <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            Onboard Talent
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-4">
          <StatBadge
            label="Total Members"
            value={totalStaff}
            icon={Users}
            color="bg-blue-500"
          />
          <StatBadge
            label="Active Now"
            value={activeStaff}
            icon={BadgeCheck}
            color="bg-green-500"
          />
          <StatBadge
            label="Departments"
            value={totalDepartments}
            icon={Building2}
            color="bg-purple-500"
          />
          <StatBadge
            label="Est. Payroll"
            value={`₱${(monthlyPayroll / 1000).toFixed(1)}k`}
            icon={Wallet}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* 2. Search & Controls */}
      <div className="flex items-center gap-4 mb-8 bg-white/60 p-2 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none outline-none text-sm font-medium text-[#0A1A44] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 3. Staff Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 bg-white/50 rounded-3xl animate-pulse border border-white/60"
            ></div>
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-24 bg-white/40 rounded-4xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#0A1A44]">No staff found</h3>
          <p className="text-slate-400 text-sm">
            Try adjusting your search filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map((staff) => (
            <StaffCard
              key={staff.id}
              staff={staff}
              onEdit={() => handleEdit(staff)}
              onDelete={() => handleDelete(staff.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchStaff();
        }}
        staffToEdit={staffToEdit}
      />
    </div>
  );
}

// --- SUBCOMPONENTS ---

function StaffCard({
  staff,
  onEdit,
  onDelete,
}: {
  staff: StaffMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deptColor =
    {
      "Front Desk": "bg-pink-500",
      Housekeeping: "bg-teal-500",
      Maintenance: "bg-orange-500",
      Management: "bg-[#0A1A44]",
      Security: "bg-slate-600",
    }[staff.department] || "bg-blue-500";

  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100">
      <div className={`h-2 w-full ${deptColor}`} />
      <div className="p-6 relative">
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 bg-white text-[#0A1A44] rounded-xl shadow-md hover:bg-blue-50 border border-blue-100"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white text-red-500 rounded-xl shadow-md hover:bg-red-50 border border-red-100"
            title="Terminate"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-2xl ${deptColor} text-white flex items-center justify-center font-serif font-bold text-2xl shadow-lg transform group-hover:rotate-3 transition-transform`}
            >
              {staff.full_name.charAt(0)}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-white rounded-full ${
                staff.status === "active"
                  ? "bg-green-500"
                  : staff.status === "terminated"
                  ? "bg-red-500"
                  : "bg-slate-400"
              }`}
            ></div>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-[#0A1A44] text-lg truncate leading-tight">
              {staff.full_name}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {staff.position}
            </p>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${deptColor} bg-opacity-90`}
            >
              {staff.department}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
              <BadgeCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Employee ID
              </p>
              <p className="text-xs font-mono font-bold text-slate-700">
                {staff.employee_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Email
              </p>
              <p
                className="text-xs font-medium text-slate-700 truncate"
                title={staff.email}
              >
                {staff.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Contact
              </p>
              <p className="text-xs font-medium text-slate-700">
                {staff.phone}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Hired {new Date(staff.hire_date).getFullYear()}</span>
          </div>

          {staff.status === "terminated" ? (
            <span className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">
              <Ban className="w-3 h-3" /> Terminated
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
              Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
