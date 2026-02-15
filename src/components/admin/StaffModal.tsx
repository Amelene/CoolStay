"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, Loader2, ShieldAlert, Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StaffSchema } from "@/lib/schemas";
import { z } from "zod";
import { toast } from "sonner";

interface StaffMember {
  id?: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  salary: number;
  hire_date?: string;
}

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staffToEdit?: StaffMember | null;
}

// ✅ UPDATED: Extend schema to override 'phone' with strict PH validation
const StaffFormSchema = StaffSchema.extend({
  role: z.string().optional(),
  phone: z.string().regex(/^09\d{9}$/, {
    message: "Must be a valid 11-digit PH mobile number (e.g., 09xxxxxxxxx)",
  }),
});

type StaffFormValues = z.infer<typeof StaffFormSchema>;

const ROLE_TO_DEPT: Record<string, string> = {
  front_desk: "Front Desk",
  housekeeping: "Housekeeping",
  manager: "Management",
  admin: "Management",
};

export default function StaffModal({
  isOpen,
  onClose,
  onSuccess,
  staffToEdit,
}: StaffModalProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(StaffFormSchema),
    mode: "onChange",
    defaultValues: {
      employee_id: "",
      full_name: "",
      email: "",
      phone: "",
      position: "Staff",
      department: "Housekeeping",
      status: "active",
      salary: 15000,
      hire_date: new Date().toISOString().split("T")[0],
      role: "front_desk",
    },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (selectedRole && !staffToEdit && ROLE_TO_DEPT[selectedRole]) {
      setValue("department", ROLE_TO_DEPT[selectedRole]);
    }
  }, [selectedRole, setValue, staffToEdit]);

  useEffect(() => {
    if (isOpen) {
      if (staffToEdit) {
        reset({
          employee_id: staffToEdit.employee_id,
          full_name: staffToEdit.full_name,
          email: staffToEdit.email,
          phone: staffToEdit.phone,
          position: staffToEdit.position,
          department: staffToEdit.department,
          status: staffToEdit.status as "active" | "inactive" | "terminated",
          salary: staffToEdit.salary,
          hire_date: staffToEdit.hire_date
            ? new Date(staffToEdit.hire_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        });
      } else {
        const randomId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

        reset({
          employee_id: randomId,
          full_name: "",
          email: "",
          phone: "",
          position: "Staff",
          department: "Front Desk",
          status: "active",
          salary: 15000,
          hire_date: new Date().toISOString().split("T")[0],
          role: "front_desk",
        });
      }
    }
  }, [isOpen, staffToEdit, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: StaffFormValues) => {
    setLoading(true);
    const toastId = toast.loading(
      staffToEdit ? "Updating profile..." : "Inviting & Onboarding..."
    );

    try {
      let userId = null;

      if (!staffToEdit) {
        const inviteRes = await fetch("/api/admin/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            fullName: data.full_name,
            role: data.role || "front_desk",
          }),
        });

        if (!inviteRes.ok) {
          const err = await inviteRes.json();
          throw new Error(err.error || "Failed to invite user");
        }

        const inviteData = await inviteRes.json();
        userId = inviteData.user_id;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { role, ...staffData } = data;

      const method = staffToEdit ? "PATCH" : "POST";
      const body = staffToEdit
        ? { ...staffData, id: staffToEdit.id }
        : { ...staffData, user_id: userId };

      const res = await fetch("/api/admin/staff", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save staff profile");
      }

      toast.dismiss(toastId);
      toast.success(
        staffToEdit
          ? "Staff member updated!"
          : "Invitation sent & Profile created!"
      );
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.dismiss(toastId);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full p-2.5 bg-slate-50 border ${
      hasError ? "border-red-500" : "border-slate-200"
    } rounded-lg focus:ring-2 focus:ring-[#0A1A44] outline-none text-sm`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0A1A44] p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold font-serif">
              {staffToEdit ? "Edit Staff Member" : "Onboard New Talent"}
            </h2>
            {!staffToEdit && (
              <p className="text-xs text-blue-200 mt-0.5">
                This will send an email invitation to set a password.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 overflow-y-auto custom-scrollbar"
        >
          {/* Role Selection */}
          {!staffToEdit && (
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                  System Access Role
                </label>
              </div>
              <select
                {...register("role")}
                className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="front_desk">
                  Front Desk (Bookings, Billing, Customers)
                </option>
                <option value="manager">
                  Manager (Reports, Staff, Inventory)
                </option>
                <option value="housekeeping">
                  Housekeeping (Room View Only)
                </option>
                <option value="admin">Super Admin (Full Access)</option>
              </select>
            </div>
          )}

          {/* Employee ID & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase mb-1">
                Employee ID
                {!staffToEdit && <Wand2 className="w-3 h-3 text-purple-500" />}
              </label>
              <input
                {...register("employee_id")}
                placeholder="EMP-XXXX"
                className={`${inputClass(
                  !!errors.employee_id
                )} bg-slate-100 text-slate-500`}
                readOnly
              />
              {errors.employee_id && (
                <p className="text-xs text-red-500">
                  {errors.employee_id.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Full Name
              </label>
              <input
                {...register("full_name", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(
                      /[^a-zA-Z\s\-\.\']/g,
                      ""
                    );
                  },
                })}
                placeholder="John Doe"
                className={inputClass(!!errors.full_name)}
              />
              {errors.full_name && (
                <p className="text-xs text-red-500">
                  {errors.full_name.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                {...register("email")}
                className={inputClass(!!errors.email)}
              />
              {errors.email && (
                <p className="text-xs text-red-500">
                  {errors.email.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Phone
              </label>
              <input
                {...register("phone", {
                  // ✅ FIX: Strict Input Masking
                  onChange: (e) => {
                    // 1. Allow only numbers
                    let val = e.target.value.replace(/[^0-9]/g, "");
                    // 2. Limit to 11 digits
                    if (val.length > 11) val = val.slice(0, 11);
                    e.target.value = val;
                  },
                })}
                // HTML constraint for better mobile keyboard
                type="tel"
                maxLength={11}
                placeholder="09xxxxxxxxx"
                className={inputClass(!!errors.phone)}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">
                  {errors.phone.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Dept & Position */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Department
              </label>
              <select
                {...register("department")}
                disabled={!staffToEdit}
                className={`${inputClass(!!errors.department)} ${
                  !staffToEdit ? "bg-slate-100 text-slate-500" : ""
                }`}
              >
                <option value="Front Desk">Front Desk</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Management">Management</option>
                <option value="Security">Security</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Position
              </label>
              <input
                {...register("position")}
                className={inputClass(!!errors.position)}
              />
            </div>
          </div>

          {/* Status & Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Status
              </label>
              <select
                {...register("status")}
                className={inputClass(!!errors.status)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Salary (₱)
              </label>
              <input
                type="number"
                {...register("salary")}
                className={inputClass(!!errors.salary)}
              />
            </div>
          </div>

          {/* Date Hired */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Date Hired
            </label>
            <input
              type="date"
              {...register("hire_date")}
              className={inputClass(!!errors.hire_date)}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0A1A44] text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {staffToEdit ? "Save Changes" : "Send Invite & Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
