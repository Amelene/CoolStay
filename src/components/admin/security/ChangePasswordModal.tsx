"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Lock, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthInput } from "@/components/auth/AuthInput";
import { toast } from "sonner";

// --- VALIDATION SCHEMA ---
// Matches your global requirements: 8 chars, 1 uppercase, 1 special/number
const PasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(
        /[0-9!@#$%^&*]/,
        "Must contain at least one number or special char",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof PasswordSchema>;

// --- HELPER COMPONENT: PASSWORD STRENGTH ---
const PasswordStrength = ({ password = "" }: { password?: string }) => {
  const checks = [
    { label: "8+ chars", valid: password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(password) },
    { label: "Number/Special", valid: /[0-9!@#$%^&*]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mt-2 px-1 animate-in slide-in-from-top-1">
      {checks.map((check, i) => (
        <div
          key={i}
          className={`flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border transition-all duration-300 ${
            check.valid
              ? "bg-green-100 border-green-200 text-green-700"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}
        >
          {check.valid ? (
            <Check className="w-3 h-3" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          )}
          {check.label}
        </div>
      ))}
    </div>
  );
};

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(PasswordSchema),
    mode: "onChange",
  });

  // Watch values for real-time UI feedback
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  // Logic to determine if passwords match visually (green check)
  const isMatch =
    password &&
    confirmPassword &&
    password === confirmPassword &&
    !errors.confirmPassword;

  if (!isOpen) return null;

  const onSubmit = async (data: PasswordFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/security/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update password");
      }

      toast.success("Password updated successfully!");
      reset();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to block spaces
  const handleNoSpaces = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "password" | "confirmPassword",
  ) => {
    const cleanVal = e.target.value.replace(/\s/g, ""); // Remove all whitespace
    setValue(field, cleanVal, { shouldValidate: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0A1A44] p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-300" />
            <h2 className="text-lg font-bold font-serif">Update Password</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* New Password Input */}
            <div>
              <AuthInput
                label="New Password"
                type="password"
                variant="outline"
                {...register("password")}
                onChange={(e) => handleNoSpaces(e, "password")}
                error={errors.password?.message}
              />
              {/* Strength Indicators */}
              <PasswordStrength password={password} />
            </div>

            {/* Confirm Password Input */}
            <AuthInput
              label="Confirm New Password"
              type="password"
              variant="outline"
              {...register("confirmPassword")}
              onChange={(e) => handleNoSpaces(e, "confirmPassword")}
              error={errors.confirmPassword?.message}
              isSuccess={!!isMatch} // ✅ Shows green check if they match
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 text-slate-600 border-slate-300 hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0A1A44] hover:bg-[#0A1A44]/90 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Save Password"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
