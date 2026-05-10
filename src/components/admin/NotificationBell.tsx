"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Loader2, CreditCard, Calendar, CalendarClock, Mail, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Detect role + capture UID from JWT on mount (no DB call)
  useEffect(() => {
    const detectRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsStaff(user?.user_metadata?.role === "staff");
      setAuthUid(user?.id ?? null);
    };
    detectRole();
  }, []);

  const fetchNotifications = async (staffMode: boolean) => {
    setLoading(true);
    const supabase = createClient();
    try {
      let query;

      if (staffMode && authUid) {
        // Staff see their own task notifications (stored with user_id = their auth UID)
        query = supabase
          .from("notifications")
          .select("*")
          .eq("user_id", authUid)
          .order("created_at", { ascending: false })
          .limit(10);
      } else {
        // Admin / manager / front_desk see admin-level alerts (user_id IS NULL)
        query = supabase
          .from("notifications")
          .select("*")
          .is("user_id", null)
          .neq("type", "promo")
          .order("created_at", { ascending: false })
          .limit(10);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setNotifications(data as Notification[]);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when isStaff or authUid resolves
  useEffect(() => {
    fetchNotifications(isStaff);

    const supabase = createClient();

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          // For staff: only surface notifications targeted to them
          if (isStaff && payload.new.user_id !== authUid) return;
          // For admin roles: only surface null user_id notifications
          if (!isStaff && payload.new.user_id !== null) return;

          toast.info("New Notification", { description: payload.new.title });
          setNotifications((prev) =>
            [payload.new as Notification, ...prev].slice(0, 10)
          );
        }
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, authUid]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string, type: string) => {
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setIsOpen(false);

    // Staff cannot navigate to booking/billing pages
    if (!isStaff) {
      if (type === "payment") router.push("/admin/billing");
      else if (type === "booking") router.push("/admin/bookings");
      else if (type === "inquiry") router.push("/admin/inquiries");
    }
  };

  const markAllAsRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "payment":  return <CreditCard   className="w-4 h-4 text-green-600" />;
      case "booking":  return <Calendar     className="w-4 h-4 text-blue-600" />;
      case "inquiry":  return <Mail         className="w-4 h-4 text-orange-600" />;
      case "shift":    return <CalendarClock className="w-4 h-4 text-purple-600" />;
      default:         return <AlertCircle  className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(isStaff);
        }}
        className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0A1A44] animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                {isStaff ? "No task notifications yet." : "No notifications yet."}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => markAsRead(notif.id, notif.type)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-3 items-start ${!notif.is_read ? "bg-blue-50/30" : ""}`}
                  >
                    <div className={`p-2 rounded-full shrink-0 ${!notif.is_read ? "bg-blue-100" : "bg-slate-100"}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">
                        {new Date(notif.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
