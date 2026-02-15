"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Star,
  Search,
  Reply,
  Inbox,
  ThumbsUp,
  AlertCircle,
  Loader2,
  Quote,
  LucideIcon,
} from "lucide-react";

// --- TYPES ---
type Feedback = {
  id: string;
  guestName: string;
  targetName: string;
  rating: number;
  comment: string;
  date: string;
  status: string;
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  color: string;
}

// --- COMPONENTS ---

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: StatCardProps) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:shadow-md transition-all">
    <div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
        {label}
      </p>
      <h3 className="text-3xl font-serif font-bold text-[#0A1A44]">{value}</h3>
      <p className="text-xs text-slate-400 font-medium mt-1">{subtext}</p>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-current`}>
      <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
    </div>
  </div>
);

export default function GuestEngagementPage() {
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch("/api/admin/feedback");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setFeedbackData(data);
      } catch (error) {
        console.error("Error fetching feedback:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  // --- DERIVED STATS ---
  const totalReviews = feedbackData.length;
  const averageRating =
    totalReviews > 0
      ? (
          feedbackData.reduce((acc, curr) => acc + curr.rating, 0) /
          totalReviews
        ).toFixed(1)
      : "0.0";
  const positiveReviews = feedbackData.filter((f) => f.rating >= 4).length;
  const criticalReviews = feedbackData.filter((f) => f.rating <= 2).length;

  // --- FILTERING ---
  const filteredData = feedbackData.filter((item) => {
    const matchesSearch =
      item.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterRating === null
        ? true
        : filterRating === 5
        ? item.rating === 5
        : filterRating === 1
        ? item.rating <= 2
        : true; // "Critical" filter

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-8 -m-6 font-sans text-slate-800">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#0A1A44] tracking-tight">
            Guest Insights
          </h1>
          <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
            What your guests are saying about their stay.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute -inset-0.5 bg-linear-to-r from-blue-200 to-indigo-200 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-200" />
          <div className="relative bg-white rounded-xl shadow-sm border border-slate-200 flex items-center px-4 py-2.5">
            <Search className="text-slate-400 w-4 h-4 mr-3" />
            <input
              type="text"
              placeholder="Search comments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm font-medium text-[#0A1A44]"
            />
          </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Avg. Rating"
          value={averageRating}
          subtext="Out of 5.0 stars"
          icon={Star}
          color="bg-yellow-500 text-yellow-600"
        />
        <StatCard
          label="Total Reviews"
          value={totalReviews}
          subtext="Lifetime feedback"
          icon={MessageSquare}
          color="bg-blue-500 text-blue-600"
        />
        <StatCard
          label="Positive Vibes"
          value={positiveReviews}
          subtext="4 & 5 Star ratings"
          icon={ThumbsUp}
          color="bg-green-500 text-green-600"
        />
        <StatCard
          label="Needs Attention"
          value={criticalReviews}
          subtext="1 & 2 Star ratings"
          icon={AlertCircle}
          color="bg-red-500 text-red-600"
        />
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { label: "All Reviews", value: null },
          { label: "5 Stars Only", value: 5 },
          { label: "Critical Issues", value: 1 },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setFilterRating(tab.value as number | null)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              filterRating === tab.value
                ? "bg-[#0A1A44] text-white border-[#0A1A44] shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Feedback Feed */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A1A44]" />
            <p className="text-sm font-bold uppercase tracking-widest">
              Gathering feedback...
            </p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1A44]">
              No reviews found
            </h3>
            <p className="text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? "Try adjusting your search terms."
                : "Waiting for guests to share their experiences."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredData.map((item) => (
              <FeedbackCard key={item.id} review={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUBCOMPONENT: REVIEW CARD ---

function FeedbackCard({ review }: { review: Feedback }) {
  // Dynamic Styling based on Rating
  const isPositive = review.rating >= 4;
  const isCritical = review.rating <= 2;

  const accentColor = isPositive
    ? "bg-green-500"
    : isCritical
    ? "bg-red-500"
    : "bg-yellow-500";
  const borderColor = isPositive
    ? "hover:border-green-200"
    : isCritical
    ? "hover:border-red-200"
    : "hover:border-yellow-200";

  return (
    <div
      className={`group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all hover:shadow-lg ${borderColor}`}
    >
      {/* Colored "Spine" Indicator */}
      <div
        className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${accentColor}`}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* User Info */}
        <div className="flex items-center gap-4 md:w-64 shrink-0">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
              isPositive
                ? "bg-green-50 text-green-700"
                : isCritical
                ? "bg-red-50 text-red-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {review.guestName.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-[#0A1A44] leading-tight">
              {review.guestName}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {review.date}
            </p>
            {isCritical && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-full">
                <AlertCircle className="w-3 h-3" /> Attention
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <StarRating rating={review.rating} />
              <span className="text-xs font-bold text-slate-300">|</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {review.targetName}
              </span>
            </div>
          </div>

          <div className="relative">
            <Quote className="absolute -top-1 -left-1 w-6 h-6 text-slate-100 transform -scale-x-100" />
            <p className="relative z-10 text-slate-600 text-sm leading-relaxed pl-6">
              {review.comment}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-row md:flex-col justify-end items-end gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0A1A44] hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap">
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors whitespace-nowrap">
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
