"use client";

import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import HomeFooter from "@/components/HomeFooter";
import { toast } from "sonner";

import { AuthInput } from "@/components/auth/AuthInput";
import { AuthSelect } from "@/components/auth/AuthSelect";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthCard } from "@/components/auth/AuthCard";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema } from "@/lib/schemas";
import { z } from "zod";

import { Check } from "lucide-react";
import { signupUser } from "../auth/actions/route";

type RegisterFormValues = z.infer<typeof RegisterSchema>;

// ... (PasswordStrength Component remains same) ...
const PasswordStrength = ({ password = "" }: { password?: string }) => {
  const checks = [
    { label: "8+ chars", valid: password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(password) },
    { label: "Number/Special", valid: /[0-9!@#$%^&*]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mt-2 px-1">
      {checks.map((check, i) => (
        <div
          key={i}
          className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border transition-all duration-300 ${
            check.valid
              ? "bg-green-400/20 border-green-400 text-green-100"
              : "bg-white/10 border-white/10 text-white/40"
          }`}
        >
          {check.valid ? (
            <Check className="w-3 h-3" />
          ) : (
            <div className="w-3 h-3 rounded-full border border-current opacity-50" />
          )}
          {check.label}
        </div>
      ))}
    </div>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Checking States
  const [emailChecking, setEmailChecking] = useState(false);
  const [isEmailTaken, setIsEmailTaken] = useState(false);

  const [phoneChecking, setPhoneChecking] = useState(false);
  const [isPhoneTaken, setIsPhoneTaken] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isValid, dirtyFields },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    mode: "onChange",
  });

  const passwordValue = watch("password");

  // ... (checkEmail function remains same) ...
  const checkEmail = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    const isValidFormat = await trigger("email");
    if (!email || !isValidFormat) return;

    setEmailChecking(true);
    setIsEmailTaken(false);

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.isTaken) {
        setIsEmailTaken(true);
        setError("email", {
          type: "manual",
          message: "Email is already registered",
        });
        toast.error("That email is already in use.");
      } else {
        setIsEmailTaken(false);
        clearErrors("email");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEmailChecking(false);
    }
  };

  // ... (checkPhone function remains same) ...
  const checkPhone = async (e: React.FocusEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    const isValidFormat = await trigger("phone");
    if (!phone || !isValidFormat) return;

    setPhoneChecking(true);
    setIsPhoneTaken(false);

    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.isTaken) {
        setIsPhoneTaken(true);
        setError("phone", {
          type: "manual",
          message: "Phone number already exists",
        });
        toast.error("That phone number is already registered.");
      } else {
        setIsPhoneTaken(false);
        clearErrors("phone");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPhoneChecking(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    if (isEmailTaken || isPhoneTaken || emailChecking || phoneChecking) return;

    setLoading(true);
    const toastId = toast.loading("Creating your account...");

    try {
      // CALL THE SERVER ACTION
      // We pass 'window.location.origin' to ensure the email link points to the correct domain (localhost vs prod)
      const result = await signupUser(data, window.location.origin);

      if (!result.success) {
        toast.dismiss(toastId);
        toast.error(result.error);
        setLoading(false);
      } else {
        toast.dismiss(toastId);
        if (result.session) {
          // This happens if email confirmation is disabled (auto-login)
          toast.success("Welcome to CoolStay!");
          router.push("/dashboard");
        } else {
          // Standard flow: Email sent
          toast.success("Account created! Please check your email to confirm.");
          router.push("/login");
        }
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const isFieldValid = (field: keyof RegisterFormValues) =>
    !errors[field] && dirtyFields[field];

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
          title="Create your account"
          subtitle="Join CoolStay for exclusive deals and faster bookings."
          maxWidth="max-w-[850px]"
        >
          <form className="w-full space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AuthInput
                label="First Name"
                placeholder="e.g. John"
                {...register("firstName", {
                  // FIX: Block numeric characters
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(
                      /[^a-zA-Z\s\-\.\']/g,
                      "",
                    );
                  },
                })}
                error={errors.firstName?.message}
                isSuccess={isFieldValid("firstName")}
              />
              <AuthInput
                label="Last Name"
                placeholder="e.g. Doe"
                {...register("lastName", {
                  // FIX: Block numeric characters
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(
                      /[^a-zA-Z\s\-\.\']/g,
                      "",
                    );
                  },
                })}
                error={errors.lastName?.message}
                isSuccess={isFieldValid("lastName")}
              />
              <AuthSelect
                label="Gender"
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Prefer not to say" },
                ]}
                {...register("gender")}
                error={errors.gender?.message}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AuthInput
                label="Email"
                type="email"
                placeholder="name@example.com"
                {...register("email")}
                onBlur={(e) => {
                  register("email").onBlur(e);
                  checkEmail(e);
                }}
                error={errors.email?.message}
                isSuccess={
                  isFieldValid("email") && !emailChecking && !isEmailTaken
                }
              />
              <AuthInput
                label="Phone Number"
                type="tel"
                placeholder="09123456789"
                {...register("phone", {
                  // FIX: Block non-numeric characters (allow +)
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^0-9+]/g, "");
                  },
                })}
                onBlur={(e) => {
                  register("phone").onBlur(e);
                  checkPhone(e);
                }}
                error={errors.phone?.message}
                isSuccess={
                  isFieldValid("phone") && !phoneChecking && !isPhoneTaken
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <AuthInput
                  label="Password"
                  type="password"
                  placeholder="Create a password"
                  {...register("password")}
                  error={errors.password?.message}
                  isSuccess={isFieldValid("password")}
                />
                <PasswordStrength password={passwordValue} />
              </div>
              <AuthInput
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                isSuccess={isFieldValid("confirmPassword")}
              />
            </div>

            <div className="pt-4 max-w-md mx-auto w-full">
              <AuthButton
                type="submit"
                disabled={
                  loading ||
                  !isValid ||
                  emailChecking ||
                  phoneChecking ||
                  isEmailTaken ||
                  isPhoneTaken
                }
                className={
                  !isValid ||
                  emailChecking ||
                  phoneChecking ||
                  isEmailTaken ||
                  isPhoneTaken
                    ? "opacity-50 cursor-not-allowed hover:transform-none"
                    : ""
                }
              >
                {loading
                  ? "Creating Account..."
                  : emailChecking
                    ? "Checking Email..."
                    : phoneChecking
                      ? "Checking Phone..."
                      : "Create My Account"}
              </AuthButton>
            </div>

            <div className="text-center space-y-4 pt-2">
              <p className="text-blue-50 text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-white font-bold underline decoration-white/50 hover:decoration-white transition-all"
                >
                  Sign in now!
                </Link>
              </p>
            </div>
          </form>
        </AuthCard>
      </div>

      <HomeFooter />
    </main>
  );
}
