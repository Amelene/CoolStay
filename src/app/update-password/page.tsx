"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { KeyRound, Lock, Loader2, Check, X } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);

  // Check if session exists (user verified OTP or Magic Link)
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expired. Please request a new code.");
        router.replace("/login");
        return;
      }
      setVerifyingSession(false);
    };
    checkSession();
  }, [supabase, router]);

  // Derived state for strength (No useEffect needed)
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(password);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/\s/.test(val)) return; // Strict: No spaces allowed
    setPassword(val);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Password updated! Please log in again.");

      // Sign out user to force re-login
      await supabase.auth.signOut();

      router.push("/login");
    }
  };

  if (verifyingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F8FF]">
        <Loader2 className="w-10 h-10 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F8FF] p-4">
      <AuthCard
        title="Create New Password"
        subtitle="Your new password must be different from previous used passwords."
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-1">
            <AuthInput
              label="New Password"
              type="password"
              placeholder="Minimum 8 chars, no spaces"
              value={password}
              onChange={handlePasswordChange}
              icon={KeyRound}
            />
            {/* Strength Meter */}
            <div className="flex gap-1 h-1.5 mt-2 px-1">
              <div
                className={`flex-1 rounded-full transition-colors ${
                  password.length > 0
                    ? strength >= 1
                      ? "bg-red-400"
                      : "bg-red-200"
                    : "bg-gray-200"
                }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${
                  password.length > 0
                    ? strength >= 2
                      ? "bg-yellow-400"
                      : "bg-gray-200"
                    : "bg-gray-200"
                }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${
                  password.length > 0
                    ? strength >= 3
                      ? "bg-blue-400"
                      : "bg-gray-200"
                    : "bg-gray-200"
                }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${
                  password.length > 0
                    ? strength >= 4
                      ? "bg-green-500"
                      : "bg-gray-200"
                    : "bg-gray-200"
                }`}
              />
            </div>
            <p className="text-[10px] text-gray-500 px-1 pt-1 flex justify-between">
              <span>
                Strength:{" "}
                {strength < 2 ? "Weak" : strength < 4 ? "Good" : "Strong"}
              </span>
              <span>{password.length}/8 chars</span>
            </p>
          </div>

          <AuthInput
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={Lock}
          />

          {confirmPassword && (
            <div className="flex items-center gap-2 text-xs px-1">
              {password === confirmPassword ? (
                <span className="text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </span>
              ) : (
                <span className="text-red-500 flex items-center gap-1">
                  <X className="w-3 h-3" /> Passwords do not match
                </span>
              )}
            </div>
          )}

          <AuthButton
            type="submit"
            disabled={loading || strength < 2 || password !== confirmPassword}
            icon={Lock}
          >
            {loading ? "Updating..." : "Reset Password"}
          </AuthButton>
        </form>
      </AuthCard>
    </div>
  );
}
