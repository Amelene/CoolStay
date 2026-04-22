"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Loader2, CreditCard, Calendar, Mail, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Matching your Notification table structure
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      // Fetch the 10 most recent notifications
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setNotifications(data as Notification[]);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const supabase = createClient();

    // 🔴 NEW: Subscribe to realtime changes on the notifications table
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Show a toast notification to the admin immediately!
          toast.info("New Notification", {
            description: payload.new.title,
          });
          
          // Prepend the new notification to the state
          setNotifications((prev) => {
            const newNotifs = [payload.new as Notification, ...prev];
            // Keep only the top 10 in the UI
            return newNotifs.slice(0, 10);
          });
        }
      )
      .subscribe();

    // Close dropdown if clicked outside
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
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string, type: string) => {
    const supabase = createClient();
    
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    // Update DB
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    
    setIsOpen(false);

    // Deep Linking: Route Admin to the correct page based on the notification type
    if (type === "payment") router.push("/admin/billing");
    else if (type === "booking") router.push("/admin/bookings");
    else if (type === "inquiry") router.push("/admin/inquiries");
  };

  const markAllAsRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    
    try {
      await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  // Helper to pick the right icon and color based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case "payment": return <CreditCard className="w-4 h-4 text-green-600" />;
      case "booking": return <Calendar className="w-4 h-4 text-blue-600" />;
      case "inquiry": return <Mail className="w-4 h-4 text-orange-600" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* The Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(); // Refresh when opening
        }}
        className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0A1A44] animate-pulse"></span>
        )}
      </button>

      {/* The Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2">
          
          {/* Header */}
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

          {/* List */}
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-white">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No notifications yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => markAsRead(notif.id, notif.type)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-3 items-start ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className={`p-2 rounded-full shrink-0 ${!notif.is_read ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">
                        {new Date(notif.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
