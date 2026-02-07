"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Settings,
  ShieldAlert,
} from "lucide-react";

interface NavbarProps {
  activePage?: string;
  logoVariant?: "image" | "text";
}

export default function Navbar({
  activePage = "",
  logoVariant = "image",
}: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSecureSession, setIsSecureSession] = useState(true);

  // States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Helper: Check if user is fully authenticated (AAL2 if required)
  const checkSecurityStatus = useCallback(async () => {
    try {
      const { data, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) return; // Ignore errors here, default to secure

      if (data && data.currentLevel === "aal1" && data.nextLevel === "aal2") {
        setIsSecureSession(false);
      } else {
        setIsSecureSession(true);
      }
    } catch (err) {
      // Fail silent
      setIsSecureSession(true);
    }
  }, [supabase]);

  useEffect(() => {
    // 1. Initial Fetch
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        // ✅ FIX: Handle "No Session" gracefully without console errors
        if (error) {
          // If the error confirms no session, we just stay as "Guest"
          if (
            error.message.includes("Auth session missing") ||
            error.name === "AuthSessionMissingError"
          ) {
            setUser(null);
            return; // Exit normally
          }
          // If it's a real error (like network issues), throw it
          throw error;
        }

        if (user) {
          setUser(user);
          const fullName = user.user_metadata?.full_name || "Member";
          setName(fullName);
          await checkSecurityStatus();
        }
      } catch (error) {
        console.error("Navbar Auth Error:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // 2. LISTENER: Auto-update when profile/auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const fullName = session.user.user_metadata?.full_name || "Member";
        setName(fullName);
        await checkSecurityStatus();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setName(null);
        setIsSecureSession(true);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, checkSecurityStatus]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { name: "Home", href: user ? "/dashboard" : "/", id: "home" },
    { name: "Accommodation", href: "/accommodation", id: "accommodation" },
    { name: "Day Pass", href: "/day-pass", id: "day-pass" },
    { name: "Plan An Event", href: "/events", id: "events" },
    { name: "Experience", href: "/experience", id: "experience" },
  ];

  const getLinkClass = (pageName: string, isMobile = false) => {
    const base = isMobile
      ? "block w-full px-6 py-4 text-lg font-medium border-b border-white/10 hover:bg-white/5 transition-colors"
      : "flex items-center gap-1 px-4 py-2 rounded-full transition-all duration-300 ease-in-out hover:text-blue-200 hover:bg-white/10";

    if (activePage === pageName) {
      return `${base} ${
        isMobile
          ? "bg-white/10 text-blue-200"
          : "bg-[#5D8CAE] text-white shadow-lg scale-105"
      }`;
    }
    return base;
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A1A44] text-white shadow-md transition-all duration-300">
      <div className="relative mx-auto flex h-20 w-full max-w-[1440px] items-center px-4 sm:px-8">
        {/* 1. LOGO */}
        <div
          className={`absolute left-4 sm:left-8 z-50 transition-all duration-500 ${
            logoVariant === "image"
              ? "top-2 hover:translate-y-1"
              : "top-0 h-full flex items-center"
          }`}
        >
          <Link
            href={user ? "/dashboard" : "/"}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {logoVariant === "image" ? (
              <div className="relative h-12 w-12 sm:h-16 sm:w-16 md:h-32 md:w-32 overflow-hidden rounded-full bg-white border-2 md:border-4 border-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 duration-300">
                <Image
                  src="/images/logo/coolstaylogo.jpg"
                  alt="CoolStay logo"
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            ) : (
              <span
                className="text-xl sm:text-3xl text-white tracking-wide transition-opacity hover:opacity-80"
                style={{ fontFamily: "var(--font-goblin), cursive" }}
              >
                CoolStay
              </span>
            )}
          </Link>
        </div>

        {/* 2. DESKTOP NAVIGATION */}
        <div className="hidden md:flex flex-1 justify-center pl-24">
          <div className="flex items-center gap-4 text-sm font-medium tracking-wide uppercase">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={getLinkClass(link.id)}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* 3. DESKTOP AUTH / PROFILE */}
        <div className="hidden md:block flex-none">
          {!loading && (
            <>
              {user ? (
                // 🔒 SECURE CHECK: If not secure, show Verify Button instead of Profile
                !isSecureSession ? (
                  <Link href="/auth/verify-2fa">
                    <Button
                      variant="white"
                      className="font-bold px-6 bg-orange-100 text-orange-700 hover:bg-orange-200 border-2 border-orange-200"
                      rounded="full"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2" /> Verify Login
                    </Button>
                  </Link>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="group flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/20 cursor-pointer"
                    >
                      <div className="flex flex-col items-end mr-2">
                        <span className="text-sm font-bold leading-none group-hover:text-blue-200 max-w-[120px] truncate">
                          {name}
                        </span>
                        <span className="text-[10px] text-blue-200 uppercase tracking-wider group-hover:text-white">
                          Member
                        </span>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-110">
                        <UserIcon className="w-6 h-6 text-[#0A1A44]" />
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl py-2 text-gray-800 animate-in fade-in zoom-in duration-200 border border-gray-100 ring-1 ring-black/5">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500 font-bold uppercase truncate">
                            {user.email}
                          </p>
                        </div>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-sm font-medium text-gray-700"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 text-sm font-medium text-gray-700"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" /> My Dashboard
                        </Link>
                        <div className="border-t border-gray-100 mt-1"></div>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 text-left px-4 py-2.5 hover:bg-red-50 text-sm font-medium text-red-600 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <Link href="/login">
                  <Button
                    variant="white"
                    rounded="full"
                    className="font-bold px-8 shadow-lg hover:scale-105"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>

        {/* 4. MOBILE MENU */}
        <div className="md:hidden ml-auto z-50">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-8 h-8" />
            ) : (
              <Menu className="w-8 h-8" />
            )}
          </button>
        </div>
      </div>

      {/* 5. MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#0A1A44] z-40 pt-24 px-4 animate-in slide-in-from-top-10 duration-300">
          <div className="flex flex-col h-full pb-10">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className={getLinkClass(link.id, true)}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="mt-auto border-t border-white/20 pt-6">
              {user ? (
                // 🔒 SECURE CHECK FOR MOBILE
                !isSecureSession ? (
                  <Link
                    href="/auth/verify-2fa"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      className="w-full justify-start gap-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/30 mb-3"
                      size="lg"
                    >
                      <ShieldAlert className="w-5 h-5" /> Complete Login (2FA)
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 px-2 mb-6">
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-[#0A1A44]">
                        <UserIcon className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">Hi, {name}</p>
                        <p className="text-sm text-blue-300">{user.email}</p>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        className="w-full justify-start gap-3 bg-white/10 hover:bg-white/20 text-white mb-3"
                        size="lg"
                      >
                        <LayoutDashboard className="w-5 h-5" /> My Dashboard
                      </Button>
                    </Link>

                    <button onClick={handleSignOut} className="w-full">
                      <Button
                        className="w-full justify-start gap-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30"
                        size="lg"
                      >
                        <LogOut className="w-5 h-5" /> Sign Out
                      </Button>
                    </button>
                  </div>
                )
              ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="white"
                    className="w-full font-bold text-lg h-14 rounded-xl shadow-lg text-[#0A1A44]"
                  >
                    Sign In / Register
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
