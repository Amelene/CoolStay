"use client";

import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeFooter from "@/components/HomeFooter";
import { toast } from "sonner";
import { Loader2, Mail, KeyRound, ArrowLeft, LogIn } from "lucide-react";

import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthCard } from "@/components/auth/AuthCard";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");

  // State
  const [view, setView] = useState<"login" | "forgot_password">("login");
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Helper for email validation
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

      // ✅ 2FA REDIRECT CHECK
      if (data.redirectUrl === "/auth/verify-2fa") {
        toast.info("Two-factor authentication required.");
        router.push("/auth/verify-2fa");
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

  // --- HANDLER: RESET PASSWORD ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

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

      if (!res.ok) throw new Error(data.error || "Failed to send reset link");

      toast.success("Reset link sent! Check your email.");
      setView("login"); // Switch back to login after success
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to send reset link");
      }
    } finally {
      setLoading(false);
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
          title={view === "login" ? "Welcome Back" : "Reset Password"}
          subtitle={
            view === "login"
              ? "Sign in to manage your bookings and explore exclusive offers."
              : "Enter your email to receive a recovery link."
          }
        >
          {view === "login" ? (
            /* --- LOGIN FORM --- */
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
                  {/* Forgot Password Link */}
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
          ) : (
            /* --- FORGOT PASSWORD FORM --- */
            <form className="w-full space-y-5" onSubmit={handleResetPassword}>
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
                  {loading ? "Sending..." : "Send Reset Link"}
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
