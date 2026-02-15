"use client";

import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeFooter from "@/components/HomeFooter";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  KeyRound,
  ArrowLeft,
  LogIn,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthCard } from "@/components/auth/AuthCard";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");

  // State: Added 'verify_otp' back
  const [view, setView] = useState<"login" | "forgot_password" | "verify_otp">(
    "login",
  );
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // Countdown timer for Resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // --- HANDLER: LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !isValidEmail(email)) {
      toast.error("Invalid email address");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Invalid password (must be at least 6 characters)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Check for 2FA requirement
      if (data.redirectUrl === "/auth/verify-2fa") {
        toast.info("Two-factor authentication required.");
        const target = returnTo
          ? `/auth/verify-2fa?return_to=${encodeURIComponent(returnTo)}`
          : "/auth/verify-2fa";
        router.push(target);
        return;
      }

      toast.success("Welcome back!");

      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push(data.redirectUrl || "/dashboard");
      }

      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: SEND OTP (Forgot Password) ---
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");

      toast.success("Code sent! Check your email.");
      setView("verify_otp"); // ✅ Switch to OTP view instead of Login
      setResendCooldown(30);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to send code");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: VERIFY OTP ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");

      // ✅ Handle Redirection (To 2FA or Update Password)
      if (data.redirectUrl) {
        if (data.redirectUrl.includes("verify-2fa")) {
          toast.info("Please verify your 2FA to continue.");
        } else {
          toast.success("Verified! Please set your new password.");
        }
        router.push(data.redirectUrl);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col font-sans text-slate-800">
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/background/coolstaybg.png"
          alt="Resort Aerial View"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
      </div>

      <Navbar logoVariant="text" />

      <div className="relative z-10 grow flex items-center justify-center p-4 pt-40 pb-20">
        <AuthCard
          title={
            view === "login"
              ? "Welcome Back"
              : view === "forgot_password"
                ? "Reset Password"
                : "Verify Identity"
          }
          subtitle={
            view === "login"
              ? "Sign in to manage your bookings and explore exclusive offers."
              : view === "forgot_password"
                ? "Enter your email to receive a login code."
                : `Enter the 6-digit code sent to ${email}`
          }
        >
          {view === "login" && (
            <form className="w-full space-y-5" onSubmit={handleLogin}>
              <div className="space-y-4">
                <AuthInput
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                />
                <div className="space-y-1">
                  <AuthInput
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={KeyRound}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setView("forgot_password")}
                      className="text-xs font-bold text-blue-100 hover:text-white transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <AuthButton type="submit" disabled={loading} icon={LogIn}>
                  {loading ? "Signing in..." : "Sign In"}
                </AuthButton>
              </div>

              <div className="text-center space-y-4 pt-2">
                <p className="text-blue-50 text-sm">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-white font-bold underline decoration-white/50 hover:decoration-white transition-all"
                  >
                    Create one now
                  </Link>
                </p>
                <p className="text-xs text-blue-100/60 leading-relaxed px-4">
                  By signing in, you agree with our Terms & Conditions and
                  Privacy Statement.
                </p>
              </div>
            </form>
          )}

          {view === "forgot_password" && (
            <form className="w-full space-y-5" onSubmit={handleSendOtp}>
              <div className="space-y-4">
                <AuthInput
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                />
              </div>

              <div className="pt-2">
                <AuthButton type="submit" disabled={loading} icon={Mail}>
                  {loading ? "Sending..." : "Send Login Code"}
                </AuthButton>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="flex items-center justify-center gap-2 text-sm font-bold text-blue-100 hover:text-white transition-colors mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </div>
            </form>
          )}

          {view === "verify_otp" && (
            <form className="w-full space-y-5" onSubmit={handleVerifyOtp}>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-blue-900 mb-1.5 uppercase tracking-wider">
                    Security Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-5 w-5 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={handleOtpChange}
                      placeholder="000000"
                      className="block w-full pl-10 pr-3 py-3 bg-white/80 border border-blue-100 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-2xl font-mono tracking-[0.5em] text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <AuthButton
                  type="submit"
                  disabled={loading || otp.length < 6}
                  icon={CheckCircle2}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </AuthButton>
              </div>

              <div className="text-center space-y-3 pt-2">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className={`flex items-center justify-center gap-2 text-sm font-bold transition-colors mx-auto ${
                    resendCooldown > 0
                      ? "text-blue-100/50 cursor-not-allowed"
                      : "text-blue-100 hover:text-white"
                  }`}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend Code"}
                </button>

                <button
                  type="button"
                  onClick={() => setView("forgot_password")}
                  className="block w-full text-xs font-medium text-blue-200/80 hover:text-white transition-colors"
                >
                  Change Email Address
                </button>
              </div>
            </form>
          )}
        </AuthCard>
      </div>
      <HomeFooter />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
