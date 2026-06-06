"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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

  // 🔒 Listen for auth state change instead of calling getUser() directly.
  // Admin invite links use the implicit flow: tokens arrive as a URL hash
  // (#access_token=...). The Supabase client processes the hash asynchronously
  // AFTER the component first mounts, so calling getUser() immediately always
  // returns null. onAuthStateChange correctly fires SIGNED_IN once the session
  // is established from the hash.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    // ⚡ Step 1: Immediately handle error tokens returned by Supabase.
    const hashError = hashParams.get("error_code") || hashParams.get("error");
    if (hashError) {
      const desc = hashParams.get("error_description")?.replace(/\+/g, " ");
      toast.error(
        hashError === "otp_expired"
          ? "This invite link has expired. Please ask your admin to send a new one."
          : desc || "Invalid invite link. Please request a new one."
      );
      router.replace("/login");
      return;
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          toast.error("Invite link is invalid or has expired. Please request a new one.");
          router.replace("/login");
        } else {
          window.history.replaceState(null, "", window.location.pathname);
          setVerifyingSession(false);
        }
      });
      return;
    }

    if (accessToken && refreshToken) {
      // ⚡ Step 2: createBrowserClient (@supabase/ssr) does NOT auto-process hash tokens.
      // It only manages sessions via cookies. We must manually call setSession() with
      // the tokens from the URL hash so Supabase can establish an authenticated session.
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (error || !data.session) {
            toast.error("Invite link is invalid or has expired. Please request a new one.");
            router.replace("/login");
          } else {
            // ✅ Session established — show the password form
            window.history.replaceState(null, "", window.location.pathname);
            setVerifyingSession(false);
          }
        });
    } else {
      // ⚡ Step 3: No tokens in hash — check for an existing cookie session
      // (e.g. user navigated directly to /update-password while already logged in).
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setVerifyingSession(false);
        } else {
          toast.error("No active session. Please use your invite link.");
          router.replace("/login");
        }
      });
    }
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
      <div className="relative min-h-screen flex items-center justify-center">
        <Image
          src="/images/background/coolstay_login.jpg"
          alt="CoolStay resort background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
        <Loader2 className="relative z-10 w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <Image
        src="/images/background/coolstay_login.jpg"
        alt="CoolStay resort background"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
      <div className="relative z-10 w-full flex justify-center">
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
                className={`flex-1 rounded-full transition-colors ${password.length > 0
                  ? strength >= 1
                    ? "bg-red-400"
                    : "bg-red-200"
                  : "bg-gray-200"
                  }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${password.length > 0
                  ? strength >= 2
                    ? "bg-yellow-400"
                    : "bg-gray-200"
                  : "bg-gray-200"
                  }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${password.length > 0
                  ? strength >= 3
                    ? "bg-blue-400"
                    : "bg-gray-200"
                  : "bg-gray-200"
                  }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${password.length > 0
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
    </div>
  );
}
