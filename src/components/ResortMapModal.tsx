"use client";

import { X } from "lucide-react";

interface ResortMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResortMapModal({
  isOpen,
  onClose,
}: ResortMapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="bg-white/90 p-2 rounded-full text-slate-800 hover:bg-white hover:text-red-500 transition-all shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="w-full h-[500px] md:h-[600px] bg-slate-100 relative">
          <iframe
            width="100%"
            height="100%"
            id="gmap_canvas"
            // UPDATED: Direct Embed for 777 Libo St, Bulakan, Bulacan
            src="https://maps.google.com/maps?q=777+Libo+St,+San+Nicolas,+Bulakan,+Bulacan&t=&z=15&ie=UTF8&iwloc=&output=embed"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
            title="CoolStay Resort Map"
          ></iframe>

          {/* Overlay Card */}
          <div className="absolute bottom-4 left-4 bg-white/95 p-4 rounded-xl shadow-lg max-w-xs backdrop-blur-md border border-slate-100">
            <h3 className="font-serif font-bold text-[#0A1A44]">
              CoolStay Resort
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              777 Libo St, Brgy. San Nicolas, <br /> Bulakan, Bulacan
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=777+Libo+St,+San+Nicolas,+Bulakan,+Bulacan"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline mt-3 inline-flex items-center gap-1"
            >
              Get Directions →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
