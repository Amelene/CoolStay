"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  CheckCheck,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  User as UserIcon,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NavbarProps {
  activePage?: string;
  logoVariant?: "image" | "text";
}

// Removed ReviewResponse type as we are using the unified notification type inline

export default function Navbar({
  activePage = "",
  logoVariant = "image",
}: NavbarProps) {
  // 2. Consume Auth Context
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // We derive the name from the user object directly
  const name = user?.user_metadata?.full_name || "Member";

  const [isSecureSession, setIsSecureSession] = useState(true);
  const [unreadReplies, setUnreadReplies] = useState(0);

  // States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      is_read: boolean;
      created_at: string;
    }>
  >([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkSecurityStatus = async () => {
      if (!user) return; // Guard clause

      const supabase = createClient();
      try {
        const { data, error } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) return;

        if (data && data.currentLevel === "aal1" && data.nextLevel === "aal2") {
          setIsSecureSession(false);
        } else {
          setIsSecureSession(true);
        }
      } catch {
        setIsSecureSession(true);
      }
    };

    checkSecurityStatus();
  }, [user]);

  // Fetch unified notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      const supabase = createClient();
      try {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          // 🔒 Grab personal alerts OR global promo broadcasts
          .or(`user_id.eq.${user.id},type.eq.promo`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (data) {
          setNotifications(data);
          setUnreadReplies(data.filter((n) => !n.is_read).length);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    if (user) {
      fetchNotifications();
      // Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await signOut(); // Use the provider's signOut
  };

  const handleNotificationClick = async (notif: typeof notifications[0]) => {
    // Mark as read
    if (!notif.is_read) {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadReplies((prev) => Math.max(0, prev - 1));
    }
    setIsNotificationOpen(false);

    // Smart routing based on notification type
    if (notif.type === "promo") {
      // Extract promo code from message and copy to clipboard
      const codeMatch = notif.message.match(/Use code (\S+) to get/);
      const code = codeMatch?.[1];
      if (code) {
        try {
          await navigator.clipboard.writeText(code);
          toast.success(`\u2705 Code "${code}" copied to clipboard!`, {
            description: "Redirecting to Accommodation...",
          });
        } catch {
          toast.info(`Promo code: ${code}`, {
            description: "Redirecting to Accommodation...",
          });
        }
      }
      router.push("/accommodation");
    } else {
      // ALL other types (booking, payment_success, payment_failed, checkout, etc.)
      // → open the Your Trips modal
      if (window.location.pathname === "/dashboard") {
        // Already on dashboard: fire a CustomEvent so the modal opens immediately
        // without needing a remount
        window.dispatchEvent(new CustomEvent("coolstay:open-trips"));
      } else {
        // On another page: navigate with query param, dashboard picks it up on mount
        router.push("/dashboard?action=trips");
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    // Use ID-based update to handle both personal and promo notifications (null user_id)
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadReplies(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const navLinks = [
    { name: "Home", href: user ? "/dashboard" : "/", id: "home" },
    { name: "Accommodation", href: "/accommodation", id: "accommodation" },
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
    <header className="fixed top-0 z-50 w-full flex flex-col shadow-md transition-all duration-300">

      <nav className="w-full bg-[#0A1A44] text-white relative">
        <div className="relative mx-auto flex h-20 w-full max-w-360 items-center px-4 sm:px-8">
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
            {authLoading ? (
              <div className="px-6">
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              </div>
            ) : (
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
                    <div className="flex items-center gap-2">
                      {/* Notification Bell */}
                      <div className="relative" ref={notificationRef}>
                        <button
                          onClick={() =>
                            setIsNotificationOpen(!isNotificationOpen)
                          }
                          className="relative p-2 rounded-full hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/20"
                        >
                          <Bell className="w-5 h-5 text-white" />
                          {unreadReplies > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                              {unreadReplies > 9 ? "9+" : unreadReplies}
                            </span>
                          )}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotificationOpen && (
                          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-2 text-gray-800 animate-in fade-in zoom-in duration-200 border border-gray-100 ring-1 ring-black/5 max-h-96 overflow-y-auto">
                            <div className="px-4 py-3 border-b border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-gray-900">
                                  Notifications
                                </h3>
                                {unreadReplies > 0 && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                                    {unreadReplies} new
                                  </span>
                                )}
                              </div>
                              {unreadReplies > 0 && (
                                <button
                                  onClick={handleMarkAllAsRead}
                                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  Mark all as read
                                </button>
                              )}
                            </div>

                            {notifications.length === 0 ? (
                              <div className="px-4 py-8 text-center text-gray-500">
                                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">No replies yet</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {notifications.map((notif) => (
                                  <button
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left flex gap-3 items-start ${
                                      !notif.is_read ? "bg-blue-50/50" : ""
                                    }`}
                                  >
                                    {!notif.is_read && (
                                      <div className="shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-xs truncate ${
                                          !notif.is_read
                                            ? "font-bold text-gray-900"
                                            : "font-medium text-gray-700"
                                        }`}
                                      >
                                        {notif.title}
                                      </p>
                                      <p
                                        className={`text-xs line-clamp-2 mt-1 ${
                                          !notif.is_read ? "text-gray-700" : "text-gray-500"
                                        }`}
                                      >
                                        {notif.message}
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                                        {new Date(notif.created_at).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Profile Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="group flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/20 cursor-pointer"
                        >
                          <div className="flex flex-col items-end mr-2">
                            <span className="text-sm font-bold leading-none group-hover:text-blue-200 max-w-30 truncate">
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
                              <LayoutDashboard className="w-4 h-4" /> My
                              Dashboard
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
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
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
    </header>
  );
}
