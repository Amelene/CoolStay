"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
const WARNING_MS = 60 * 1000; // Warning at 60 seconds remaining

export default function IdleTimer() {
  const router = useRouter();

  // FIX 1: Use useRef instead of useState for high-frequency updates.
  // This prevents the component from re-rendering on every mouse movement.
  const lastActivityRef = useRef<number>(0);

  // Only use state for the UI warning visibility
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.error("Session expired due to inactivity.");
    router.push("/login");
  }, [router]);

  const handleActivity = useCallback(() => {
    // FIX 2: Update the ref silently (no re-render)
    lastActivityRef.current = Date.now();

    // Only trigger a re-render if we need to hide the warning
    setShowWarning((prev) => {
      if (prev) return false;
      return prev;
    });
  }, []);

  useEffect(() => {
    // Initialize the timer on mount (Client-side only)
    lastActivityRef.current = Date.now();

    // Listen for user actions
    // These listeners are now cheap because handleActivity doesn't re-render
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Check time every second
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        // TIME UP: Logout
        clearInterval(interval);
        handleLogout();
      } else if (remaining <= WARNING_MS) {
        // WARNING: Show alert and update countdown
        setShowWarning(true);
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(interval);
    };
  }, [handleActivity, handleLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center border-4 border-red-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#0A1A44] mb-2">
          Are you still there?
        </h2>
        <p className="text-slate-500 mb-6">
          For security, you will be logged out in <br />
          <span className="text-red-600 font-bold text-3xl font-mono block mt-2">
            {Math.ceil(timeLeft / 1000)}s
          </span>
        </p>
        <button
          onClick={handleActivity}
          className="w-full py-3 bg-[#0A1A44] text-white font-bold rounded-xl hover:bg-blue-900 transition-all"
        >
          I&apos;m still here
        </button>
      </div>
    </div>
  );
}
