"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminNavbar() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.user_metadata?.full_name) {
        setName(user.user_metadata.full_name);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-[#0A1A44] text-white flex items-center justify-between px-6 lg:px-8 shadow-md fixed top-0 right-0 left-0 z-30 lg:left-64 transition-all">
      {/* Mobile Title & Logo (Only visible on small screens) */}
      <div className="lg:hidden flex items-center gap-3">
        <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/20">
          <Image
            src="/images/logo/coolstaylogo.jpg"
            alt="Logo"
            fill
            className="object-cover"
          />
        </div>
        <span className="text-xl font-serif font-bold">CoolStay</span>
      </div>

      {/* Spacer for Desktop (pushes content right) */}
      <div className="hidden lg:block"></div>

      {/* Right Side: Profile & Actions */}
      <div className="flex items-center gap-4 sm:gap-8">
        <button
          onClick={handleSignOut}
          className="text-xs font-bold text-white hover:text-gray-300 transition-colors uppercase tracking-wider flex items-center gap-2"
        >
          SIGN OUT
        </button>

        {/* ✅ Dynamic Admin Profile */}
        <div className="bg-white text-black rounded-full pl-2 pr-4 py-1.5 flex items-center gap-2 shadow-sm min-w-[120px] justify-center">
          <div className="bg-gray-200 rounded-full p-1">
            <User className="w-4 h-4 text-gray-600 fill-current" />
          </div>
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span className="font-bold text-sm tracking-wide truncate max-w-[150px]">
              {name || "ADMIN"}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
