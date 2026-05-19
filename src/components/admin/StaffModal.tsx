"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { onboardSchema, type OnboardFormData } from "@/lib/schemas";

type SystemRole = "admin" | "manager" | "front_desk" | "staff";

interface EditableStaff {
  id: number;
  user_id?: string | null;
  employee_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  salary: number;
  hire_date: string;
  system_role?: SystemRole;
}

interface StaffModalProps {
  isOpen: boolean;
  staffToEdit?: EditableStaff | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_MAPPING: Record<
  SystemRole,
  {
    label: string;
    positions: string[];
    department: string;
    salary: number;
  }
> = {
  admin: {
    label: "Super Admin Access",
    positions: ["Super Admin", "Administrator"],
    department: "Management",
    salary: 45000,
  },
  manager: {
    label: "Manager Access",
    positions: ["Operations Manager", "Resort Manager"],
    department: "Management",
    salary: 35000,
  },
  front_desk: {
    label: "Front Desk Access",
    positions: ["Receptionist", "Concierge", "Front Desk Officer"],
    department: "Front Desk",
    salary: 22000,
  },
  staff: {
    label: "Staff Access",
    positions: ["Cleaner", "Maintenance", "Security"],
    department: "Operations",
    salary: 16000,
  },
};

const getInitialState = (): OnboardFormData => ({
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  phone: "+639",
  employee_id: "Generating...",
  system_role: "staff",
  position: ROLE_MAPPING.staff.positions[0],
  salary: ROLE_MAPPING.staff.salary,
  hire_date: new Date().toISOString().split("T")[0],
});

const getEditState = (staff: EditableStaff): OnboardFormData => {
  const role = staff.system_role || "staff";

  return {
    first_name: staff.first_name || "",
    middle_name: staff.middle_name || "",
    last_name: staff.last_name || "",
    email: staff.email || "",
    phone: staff.phone || "+639",
    employee_id: staff.employee_id || "",
    system_role: role,
    position: staff.position || ROLE_MAPPING[role].positions[0],
    salary: Number(staff.salary || ROLE_MAPPING[role].salary),
    hire_date:
      staff.hire_date?.substring(0, 10) ||
      new Date().toISOString().split("T")[0],
  };
};

export default function StaffModal({
  isOpen,
  staffToEdit,
  onClose,
  onSuccess,
}: StaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardFormData>(getInitialState());
  const isEditing = Boolean(staffToEdit);

  const errors = useMemo(() => {
    const result = onboardSchema.safeParse(formData);
    if (result.success) return {};
    return result.error.flatten().fieldErrors;
  }, [formData]);

  const fetchNextId = async () => {
    const res = await fetch("/api/admin/staff?nextEmployeeId=true");
    if (!res.ok) return;
    const data = await res.json();
    setFormData((prev) => ({
      ...prev,
      employee_id: data.employee_id || prev.employee_id,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;

    if (staffToEdit) {
      setFormData(getEditState(staffToEdit));
    } else {
      setFormData(getInitialState());
      fetchNextId();
    }
  }, [isOpen, staffToEdit]);

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
    const daysWorked = Math.ceil(
      (now.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const estimate = (formData.salary / 22) * Math.min(daysWorked, 22);

    return estimate.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const updateField = <K extends keyof OnboardFormData>(
    key: K,
    value: OnboardFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = onboardSchema.safeParse(formData);
    if (!validation.success) {
      toast.error("Please fix form errors.");
      return;
    }

    setLoading(true);

    try {
      const fullName =
        `${formData.first_name} ${formData.middle_name ? `${formData.middle_name} ` : ""}${formData.last_name}`.trim();
      const roleConfig = ROLE_MAPPING[formData.system_role as SystemRole];
      const payload = {
        email: formData.email,
        full_name: fullName,
        role: formData.system_role,
        phone: formData.phone,
        employee_id: formData.employee_id,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        position: formData.position,
        department: roleConfig.department,
        salary: formData.salary,
        hire_date: formData.hire_date,
      };

      const res = await fetch(isEditing ? "/api/admin/staff" : "/api/admin/invite", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing && staffToEdit
            ? { id: staffToEdit.id, user_id: staffToEdit.user_id, ...payload }
            : payload,
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || (isEditing ? "Update failed" : "Invitation failed"),
        );
      }

      toast.success(
        isEditing
          ? "Staff profile and role updated."
          : "Staff account created and invitation sent.",
      );

      if (!isEditing) setFormData(getInitialState());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEditing
            ? "Error updating staff"
            : "Error onboarding staff";
      toast.error(msg);
      console.error("Staff modal error:", msg);
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
            {isEditing ? (
              <Save className="w-5 h-5 text-[#0A1A44]" />
            ) : (
              <UserPlus className="w-5 h-5 text-[#0A1A44]" />
            )}
            <h2 className="text-lg font-bold text-[#0A1A44]">
              {isEditing ? "Edit Staff Profile" : "Onboard New Talent"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Employee ID
              </label>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-600 border border-slate-200">
                {formData.employee_id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Hire Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.hire_date}
                onChange={(e) => updateField("hire_date", e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["first_name", "middle_name", "last_name"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  {key.replace("_", " ")}{" "}
                  {key !== "middle_name" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  placeholder={key.replace("_", " ")}
                  value={formData[key] || ""}
                  onChange={(e) => updateField(key, e.target.value)}
                  className={`w-full p-2.5 bg-slate-50 border rounded-xl text-sm outline-none ${
                    errors[key]
                      ? "border-red-300 bg-red-50/30"
                      : "border-slate-200"
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={`w-full p-2.5 bg-slate-50 border rounded-xl text-sm outline-none ${
                  errors.email ? "border-red-300" : "border-slate-200"
                }`}
              />
              {errors.email && (
                <p className="text-[9px] text-red-500 font-bold italic">
                  {errors.email[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                maxLength={13}
                value={formData.phone}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d+]/g, "");
                  if (next.startsWith("+639")) updateField("phone", next);
                }}
                className={`w-full p-2.5 bg-slate-50 border rounded-xl text-sm outline-none ${
                  errors.phone ? "border-red-300" : "border-slate-200"
                }`}
              />
              {errors.phone && (
                <p className="text-[9px] text-red-500 font-bold italic">
                  {errors.phone[0]}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <select
                value={formData.system_role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
              >
                {(Object.keys(ROLE_MAPPING) as SystemRole[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_MAPPING[role].label}
                  </option>
                ))}
              </select>
              <select
                value={formData.position}
                onChange={(e) => updateField("position", e.target.value)}
                className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
              >
                {ROLE_MAPPING[formData.system_role as SystemRole].positions.map(
                  (position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="flex flex-col justify-center border-l border-blue-100 pl-4">
              <div className="text-lg font-black text-[#0A1A44]">
                PHP {formData.salary.toLocaleString()}{" "}
                <span className="text-[8px] text-blue-400 uppercase">/ Mo</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-600">
                Est. Earnings: PHP {calculatePayrollPreview()}
              </div>
            </div>
          </div>

          <button
            disabled={loading || Object.keys(errors).length > 0}
            type="submit"
            className="w-full py-3.5 bg-[#0A1A44] disabled:bg-slate-300 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditing ? (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            ) : (
              "Complete Registration"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
