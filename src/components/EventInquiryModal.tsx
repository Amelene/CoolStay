"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventInquirySchema } from "@/lib/schemas";
import { z } from "zod";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Calendar,
  Users,
  Mail,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { AuthButton } from "@/components/auth/AuthButton";
import { User } from "@supabase/supabase-js"; // Type

type EventFormValues = z.infer<typeof EventInquirySchema>;

interface EventInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null; // Accept user prop
}

export default function EventInquiryModal({
  isOpen,
  onClose,
  user,
}: EventInquiryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(EventInquirySchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      eventType: undefined,
      date: "",
      guestCount: 50,
      message: "",
    },
  });

  // AUTO-FILL LOGIC
  useEffect(() => {
    if (user) {
      // Supabase user metadata stores full_name, phone, etc. usually.
      // Adjust keys based on your actual auth metadata structure
      const meta = user.user_metadata;
      reset({
        fullName: meta?.full_name || "",
        email: user.email || "",
        phone: meta?.phone || "",
        eventType: undefined,
        date: "",
        guestCount: 50,
        message: "",
      });
    }
  }, [user, reset]);

  if (!isOpen) return null;

  // ... (Rest of onSubmit and render logic remains exactly the same) ...
  const onSubmit = async (data: EventFormValues) => {
    const selectedDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part

    if (selectedDate < today) {
      toast.error(
        "Invalid date. Please select a date that is today or in the future."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/events/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to send inquiry");

      toast.success(
        "Inquiry sent! Our event coordinator will contact you soon."
      );
      reset(); // Resets to defaults (which will then be re-filled by useEffect if user exists)
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(
        "Something went wrong. Please try again or call us directly."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (error?: string) =>
    `w-full p-3 pl-10 rounded-xl border ${
      error ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50"
    } focus:ring-2 focus:ring-[#0A1A44] focus:bg-white outline-none transition-all text-sm text-[#0A1A44] font-medium`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#0A1A44] p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-serif font-bold">Plan Your Event</h2>
            <p className="text-blue-200 text-xs mt-1">
              Tell us about your dream celebration.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 space-y-4 overflow-y-auto custom-scrollbar"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                {...register("fullName")}
                placeholder="e.g. Maria Clara"
                className={inputClass(errors.fullName?.message as string)}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-red-500 ml-1">
                {errors.fullName.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  {...register("email")}
                  placeholder="name@email.com"
                  className={inputClass(errors.email?.message as string)}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 ml-1">
                  {errors.email.message as string}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  {...register("phone")}
                  placeholder="0917..."
                  className={inputClass(errors.phone?.message as string)}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 ml-1">
                  {errors.phone.message as string}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Event Type
              </label>
              <div className="relative">
                <select
                  {...register("eventType")}
                  defaultValue=""
                  className={`${inputClass(
                    errors.eventType?.message as string
                  )} appearance-none`}
                >
                  <option value="" disabled>
                    Select Type
                  </option>
                  <option value="Wedding">Wedding</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Social">Social Gathering</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
              {errors.eventType && (
                <p className="text-xs text-red-500 ml-1">
                  {errors.eventType.message as string}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Est. Guests
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  {...register("guestCount")}
                  placeholder="50"
                  className={inputClass(errors.guestCount?.message as string)}
                />
              </div>
              {errors.guestCount && (
                <p className="text-xs text-red-500 ml-1">
                  {errors.guestCount.message as string}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Preferred Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="date"
                {...register("date")}
                min={new Date().toISOString().split("T")[0]}
                className={inputClass(errors.date?.message as string)}
              />
            </div>
            {errors.date && (
              <p className="text-xs text-red-500 ml-1">
                {errors.date.message as string}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Additional Notes
            </label>
            <textarea
              {...register("message")}
              rows={3}
              placeholder="Tell us more about your event requirements..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-[#0A1A44] focus:bg-white outline-none transition-all text-sm text-[#0A1A44]"
            />
          </div>

          <div className="pt-2">
            <AuthButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...
                </>
              ) : (
                "Send Inquiry"
              )}
            </AuthButton>
          </div>
        </form>
      </div>
    </div>
  );
}
