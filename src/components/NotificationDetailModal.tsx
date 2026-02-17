"use client";

import { Calendar, MessageSquare, Star, X } from "lucide-react";
import { Button } from "./ui/Button";

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: {
    id: string;
    rating: number;
    comment: string;
    admin_reply: string;
    replied_at: string;
    room_types?: { name: string } | null;
    Cottages?: { name: string } | null;
  };
}

export default function NotificationDetailModal({
  isOpen,
  onClose,
  notification,
}: NotificationDetailModalProps) {
  if (!isOpen) return null;

  const roomName = notification.room_types?.name || notification.Cottages?.name || "General Review";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A1A44] to-blue-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">CoolStay Reply</h2>
              <p className="text-sm text-blue-200">Review Response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Room Info */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                  Accommodation
                </p>
                <p className="text-lg font-bold text-[#0A1A44]">{roomName}</p>
              </div>
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                <span className="text-sm font-bold text-yellow-700">
                  {notification.rating}.0
                </span>
              </div>
            </div>
          </div>

          {/* Your Review */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">You</span>
              </div>
              <p className="text-sm font-bold">Your Review</p>
            </div>
            <div className="ml-10 bg-gray-50 rounded-2xl rounded-tl-none p-4 border border-gray-100">
              <p className="text-gray-700 leading-relaxed">{notification.comment}</p>
            </div>
          </div>

          {/* Admin Reply */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#0A1A44]">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold">CoolStay</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(notification.replied_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
            <div className="ml-10 bg-blue-50 rounded-2xl rounded-tl-none p-4 border border-blue-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {notification.admin_reply}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-[#0A1A44] hover:bg-blue-900 text-white px-6 rounded-xl"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
