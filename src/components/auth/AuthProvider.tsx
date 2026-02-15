"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Routes that require active login. If session dies here, we redirect.
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/bookings", "/payment"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // ✅ FIX: Initialize supabase once so it is stable across renders
  const [supabase] = useState(() => createClient());

  // ✅ FIX: Wrap in useCallback to satisfy linter dependency rules
  const checkUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUser(null);
      } else {
        setUser(user);
      }
    } catch {
      // ✅ FIX: Removed unused 'err'
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // 1. Initial Check on Mount
    checkUser();

    // 2. Real-time Listener (The "Heartbeat")
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Immediate state update from the event
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);

      // 3. Security Redirects
      if (
        !session &&
        PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
      ) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase, checkUser]); // ✅ FIX: Added missing dependencies

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  const refreshSession = async () => {
    await checkUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
