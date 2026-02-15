"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface ReviewModalProps {
  bookingId: string; // Ensure this is passed
  roomId: string;
  roomName: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({
  bookingId,
  roomId,
  roomName,
  userId,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();

    // Check if already reviewed (Double check for safety)
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .single();

    if (existing) {
      toast.error("You have already reviewed this stay.");
      setSubmitting(false);
      onClose();
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      room_id: roomId,
      booking_id: bookingId, // Link the booking!
      rating: rating,
      comment: comment,
    });

    if (error) {
      toast.error("Failed to submit review: " + error.message);
      setSubmitting(false);
    } else {
      toast.success("Thank you for your review!");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in">
        <h2 className="text-2xl font-serif font-bold text-[#0A1A44] mb-2">
          Rate your stay
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          How was your experience at {roomName}?
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-4xl transition-transform hover:scale-110 ${
                  rating >= star ? "text-yellow-400" : "text-gray-200"
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            required
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32 text-slate-800"
            placeholder="Tell us what you liked..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-200 text-slate-700"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0A1A44] text-white"
              disabled={submitting}
            >
              {submitting ? "Posting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
