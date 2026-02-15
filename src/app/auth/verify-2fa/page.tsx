"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, Loader2, Lock, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { AuthButton } from "@/components/auth/AuthButton";

// Schema
const VerifySchema = z.object({
  code: z
    .string()
    .min(6, "Code must be 6 digits")
    .max(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Must be numbers only"),
});

type VerifyFormValues = z.infer<typeof VerifySchema>;

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");

  const [loading, setLoading] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(VerifySchema),
    mode: "onChange",
  });

  const codeValue = watch("code");

  const onSubmit = async (data: VerifyFormValues) => {
    setLoading(true);
    try {
      // 1. Verify the 2FA Code
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Verification failed");
      }

      toast.success("Identity verified successfully!");

      // 2. Determine Redirection Logic
      if (returnTo) {
        // A. If there is a specific return path, use it
        router.replace(returnTo);
      } else {
        // B. If no return path (Direct Login), check Role to decide destination
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

          if (dbUser?.role === "admin" || dbUser?.role === "front_desk") {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/dashboard");
          }
        } else {
          // Fallback if session fetch fails weirdly
          router.replace("/dashboard");
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Invalid code");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    setExitLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error", error);
      router.push("/login");
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center font-sans text-slate-800 bg-[#0A1A44]">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/background/coolstaybg.png"
          alt="Background"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-[#0A1A44]/80 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="bg-linear-to-r from-[#0A1A44] to-[#1e3a8a] p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full -ml-10 -mb-10" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20 shadow-inner">
                <ShieldCheck className="w-10 h-10 text-blue-200" />
              </div>
              <h1 className="text-2xl font-bold text-white font-serif tracking-wide">
                Security Check
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Please complete your login
              </p>
            </div>
          </div>

          <div className="p-8 pt-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <label className="block text-center text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Enter Authenticator Code
                </label>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock
                      className={`w-5 h-5 transition-colors duration-300 ${codeValue?.length === 6 ? "text-blue-600" : "text-slate-400"}`}
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    className={`w-full pl-12 pr-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] bg-slate-50 border-2 rounded-xl outline-none transition-all duration-300 ${errors.code ? "border-red-300 focus:border-red-500 bg-red-50 text-red-600 placeholder-red-200" : "border-slate-200 focus:border-blue-600 focus:bg-white text-[#0A1A44] placeholder-slate-300"}`}
                    {...register("code", {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, "");
                      },
                    })}
                  />
                </div>
                {errors.code && (
                  <p className="text-center text-xs font-bold text-red-500 animate-pulse">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <AuthButton
                  type="submit"
                  disabled={!isValid || loading}
                  className="h-14 text-lg shadow-lg shadow-blue-900/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />{" "}
                      Verifying...
                    </>
                  ) : (
                    "Verify Identity"
                  )}
                </AuthButton>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  disabled={exitLoading}
                  className="w-full py-3 text-center text-sm font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {exitLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Cancel & Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A1A44]" />}>
      <Verify2FAContent />
    </Suspense>
  );
}
