"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { KeyRound, AlertCircle } from "lucide-react"; // Added AlertCircle for error state

export default function UpdatePasswordPage() {
  const router = useRouter();

  // 1. Initialize Supabase Client
  const [supabase] = useState(() => createClient());

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [debugStatus, setDebugStatus] = useState("Initializing...");

  // 2. ROBUST SESSION RECOVERY & ERROR HANDLING
  useEffect(() => {
    const handleSession = async () => {
      // --- FIX 1: CHECK FOR URL ERRORS FIRST ---
      // Supabase returns errors in the URL hash or query params (e.g., link expired)
      // We must catch these to stop the "Verifying..." infinite loop.
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1)); // remove '#'

      const error = searchParams.get("error") || hashParams.get("error");
      const errorDesc =
        searchParams.get("error_description") ||
        hashParams.get("error_description");

      if (error) {
        const msg =
          errorDesc?.replace(/\+/g, " ") || "Link expired or invalid.";
        setDebugStatus(`Error: ${msg}`);
        toast.error(msg);

        // Give the user a moment to read the error, then redirect
        setTimeout(() => {
          router.push("/login");
        }, 4000);
        return; // STOP EXECUTION HERE
      }

      // --- EXISTING LOGIC: CHECK FOR SUCCESSFUL SESSION ---

      // A. Check for existing session via storage
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsSessionValid(true);
        setDebugStatus("Session Active (Storage)");
        return;
      }

      // --- FIX 2: THE "FORCE" FIX (Manual Hash Parsing) ---
      // B. Manually Parse URL Hash for Access Token
      // This ensures we capture the token even if Supabase's auto-detector misses it
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        try {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            setDebugStatus("Found Token in URL, forcing session...");

            // Force Set Session
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (!sessionError) {
              setIsSessionValid(true);
              setDebugStatus("Session Forced Successfully");
              // Clear hash to clean up URL (optional, but looks nicer)
              window.history.replaceState(null, "", window.location.pathname);
            } else {
              setDebugStatus(`Error forcing session: ${sessionError.message}`);
              toast.error("Failed to establish session from link.");
            }
          }
        } catch (e) {
          console.error("Error parsing hash:", e);
          setDebugStatus("Error parsing token parameters");
        }
      } else {
        // If we have no session, no error, and no token in hash, we are just lost.
        setDebugStatus("No session or token found. Please try logging in.");
      }
    };

    // Listen for standard events as a backup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsSessionValid(true);
        setDebugStatus(`Auth Event: ${event}`);
      }
    });

    handleSession();

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // 3. Last Check before Update
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session lost. Please click the invite link again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Password set successfully! Logging you in...");
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F8FF] p-4">
      <AuthCard
        title="Set New Password"
        subtitle="Please enter your new password below."
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <AuthInput
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={KeyRound}
          />

          <AuthButton
            type="submit"
            disabled={loading || !isSessionValid}
            icon={isSessionValid ? KeyRound : AlertCircle}
            className={!isSessionValid ? "opacity-75 cursor-not-allowed" : ""}
          >
            {!isSessionValid
              ? `Status: ${debugStatus}`
              : loading
                ? "Updating..."
                : "Set Password"}
          </AuthButton>
        </form>
      </AuthCard>
    </div>
  );
}
