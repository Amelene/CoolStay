"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react"; // Added
import ResortMapModal from "@/components/ResortMapModal"; // Added

interface HomeFooterProps {
  showSignOut?: boolean;
}

export default function HomeFooter({ showSignOut = false }: HomeFooterProps) {
  const router = useRouter();
  const [isMapOpen, setIsMapOpen] = useState(false); // State for modal

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <footer className="bg-[#4E342E] text-[#D7CCC8] py-4 px-8 border-t-4 border-[#3E2723] z-20 relative">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-sm font-serif font-semibold tracking-wide">
          {/* Left Links - Always on the left */}
          <div className="flex gap-8">
            <Link
              href="/about"
              className="hover:text-white uppercase transition-colors duration-300 hover:tracking-widest"
            >
              About Us
            </Link>

            {/* Replaced Link with Button to open Modal */}
            <button
              onClick={() => setIsMapOpen(true)}
              className="hover:text-white uppercase transition-colors duration-300 hover:tracking-widest bg-transparent border-none cursor-pointer font-serif font-semibold text-sm text-[#D7CCC8]"
            >
              Resort Map
            </button>
          </div>

          {/* Dynamic Sign Out Link - Pushed to the right */}
          {showSignOut && (
            <button
              onClick={handleSignOut}
              className="text-red-200 hover:text-red-50 uppercase transition-colors duration-300 hover:tracking-widest bg-transparent border-none cursor-pointer font-serif font-semibold text-sm"
            >
              Sign Out
            </button>
          )}
        </div>
      </footer>

      {/* Render Map Modal */}
      <ResortMapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </>
  );
}
