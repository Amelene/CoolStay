"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, ArrowLeft, Loader2, Lock } from "lucide-react";

import Navbar from "@/components/Navbar";
import HomeFooter from "@/components/HomeFooter";
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

export default function Verify2FAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      router.push("/admin/dashboard");
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

  return (
    <main className="relative min-h-screen flex flex-col font-sans text-slate-800">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/background/coolstaybg.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#0A1A44]/60 backdrop-blur-sm" />
      </div>

      <Navbar logoVariant="text" />

      <div className="relative z-10 grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header Section */}
          <div className="bg-linear-to-r from-[#0A1A44] to-[#1e3a8a] p-8 text-center relative overflow-hidden">
            {/* Decorative Circles */}
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
                Two-Factor Authentication
              </p>
            </div>
          </div>

          {/* Form Section */}
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
                    className={`
                            w-full pl-12 pr-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] 
                            bg-slate-50 border-2 rounded-xl outline-none transition-all duration-300
                            ${
                              errors.code
                                ? "border-red-300 focus:border-red-500 bg-red-50 text-red-600 placeholder-red-200"
                                : "border-slate-200 focus:border-blue-600 focus:bg-white text-[#0A1A44] placeholder-slate-300"
                            }
                        `}
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
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Identity"
                  )}
                </AuthButton>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full py-2 text-center text-sm font-bold text-slate-400 hover:text-[#0A1A44] transition-colors flex items-center justify-center gap-2 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <HomeFooter />
    </main>
  );
}
