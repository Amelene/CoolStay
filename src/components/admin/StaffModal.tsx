"use client";

import { useState, useEffect, useMemo } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { onboardSchema, type OnboardFormData } from "@/lib/schemas";

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_MAPPING = {
  admin: { positions: ["Super Admin"], salary: 45000 },
  manager: { positions: ["Operations Manager"], salary: 35000 },
  front_desk: { positions: ["Receptionist", "Concierge"], salary: 22000 },
  staff: { positions: ["Cleaner", "Maintenance", "Security"], salary: 16000 },
};

// 🔒 Helper to ensure a fresh object on every reset
const getInitialState = (): OnboardFormData => ({
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  phone: "+639",
  employee_id: "Generating...",
  system_role: "staff",
  position: "Cleaner",
  salary: 16000,
  hire_date: new Date().toISOString().split("T")[0],
});

type SystemRole = keyof typeof ROLE_MAPPING;

export default function StaffModal({ isOpen, onClose, onSuccess }: StaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardFormData>(getInitialState());

  const errors = useMemo(() => {
    const result = onboardSchema.safeParse(formData);
    if (result.success) return {};
    return result.error.flatten().fieldErrors;
  }, [formData]);

  const fetchNextId = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("generate_next_employee_id");
    if (!error) setFormData((prev) => ({ ...prev, employee_id: data }));
  };

  // 🔒 Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());
      fetchNextId();
    }
  }, [isOpen]);

  const handleRoleChange = (role: string) => {
    const selectedRole = role as SystemRole;
    const config = ROLE_MAPPING[selectedRole];
    setFormData((prev) => ({
      ...prev,
      system_role: selectedRole,
      position: config.positions[0],
      salary: config.salary,
    }));
  };

  const calculatePayrollPreview = () => {
    const hireDate = new Date(formData.hire_date);
    const now = new Date();
    if (hireDate > now) return "0.00";
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const effectiveStart = hireDate > startOfMonth ? hireDate : startOfMonth;
    const daysWorked = Math.ceil((now.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
    const estimate = (formData.salary / 22) * Math.min(daysWorked, 22);
    return estimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = onboardSchema.safeParse(formData);
    if (!validation.success) return toast.error("Please fix form errors.");

    setLoading(true);
    const supabase = createClient();

    try {
      const fullName = `${formData.first_name} ${formData.middle_name ? formData.middle_name + " " : ""}${formData.last_name}`;

      // Single API call — the server atomically creates:
      //   1. auth.users (invite email)
      //   2. public.users profile  ┐ wrapped in one PostgreSQL
      //   3. staff record          ┘ transaction via RPC
      const inviteRes = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        formData.email,
          full_name:    fullName,
          role:         formData.system_role,
          phone:        formData.phone,
          employee_id:  formData.employee_id,
          first_name:   formData.first_name,
          middle_name:  formData.middle_name,
          last_name:    formData.last_name,
          position:     formData.position,
          department:   formData.system_role === "staff" ? "Operations" : "Management",
          salary:       formData.salary,
          hire_date:    formData.hire_date,
        }),
      });

      const inviteData = await inviteRes.json();
      if (!inviteRes.ok) throw new Error(inviteData.error || "Invitation failed");

      toast.success("Talent onboarded and invitation sent!");

      // 🔒 CLEANUP
      setFormData(getInitialState());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error onboarding talent";
      toast.error(msg);
      console.error("Onboarding Error:", msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-4xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-[#0A1A44]" />
            <h2 className="text-lg font-bold text-[#0A1A44]">Onboard New Talent</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Employee ID</label>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-600 border border-slate-200">{formData.employee_id}</div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Hire Date <span className="text-red-500">*</span></label>
              <input type="date" required value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["first_name", "middle_name", "last_name"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  {key.replace("_", " ")} {key !== "middle_name" && <span className="text-red-500">*</span>}
                </label>
                <input
                  placeholder={key.replace("_", " ")}
                  value={formData[key] || ""}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl text-sm outline-none ${errors[key] ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Email Address <span className="text-red-500">*</span></label>
              <input type="email" placeholder="user@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`w-full p-2.5 bg-slate-50 border rounded-xl text-sm outline-none ${errors.email ? 'border-red-300' : 'border-slate-200'}`} />
              {errors.email && <p className="text-[9px] text-red-500 font-bold italic">{errors.email[0]}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Phone Number <span className="text-red-500">*</span></label>
              <input
                maxLength={13}
                value={formData.phone}
                onChange={(e) => e.target.value.startsWith("+639") && setFormData({ ...formData, phone: e.target.value.replace(/[^\d+]/g, '') })}
                className={`w-full p-2.5 bg-slate-50 border rounded-xl text-sm outline-none ${errors.phone ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.phone && <p className="text-[9px] text-red-500 font-bold italic">{errors.phone[0]}</p>}
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <select value={formData.system_role} onChange={(e) => handleRoleChange(e.target.value)} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none">
                <option value="staff">Staff Access</option>
                <option value="front_desk">Front Desk Access</option>
                <option value="manager">Manager Access</option>
                <option value="admin">Super Admin Access</option>
              </select>
              <select value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none">
                {ROLE_MAPPING[formData.system_role as SystemRole].positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-center border-l border-blue-100 pl-4">
              <div className="text-lg font-black text-[#0A1A44]">₱{formData.salary.toLocaleString()} <span className="text-[8px] text-blue-400 uppercase">/ Mo</span></div>
              <div className="text-[10px] font-bold text-emerald-600">Est. Earnings: ₱{calculatePayrollPreview()}</div>
            </div>
          </div>

          <button disabled={loading || Object.keys(errors).length > 0} type="submit" className="w-full py-3.5 bg-[#0A1A44] disabled:bg-slate-300 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}