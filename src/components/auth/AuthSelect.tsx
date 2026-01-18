import React, { forwardRef } from "react";

interface AuthSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  variant?: "glass" | "outline"; // ✅ New Prop
}

export const AuthSelect = forwardRef<HTMLSelectElement, AuthSelectProps>(
  (
    { label, options, className = "", error, variant = "glass", ...props },
    ref,
  ) => {
    const isGlass = variant === "glass";
    const labelColor = isGlass ? "text-white" : "text-[#0A1A44]";

    const baseStyles = isGlass
      ? "bg-white/20 text-white border-white/20 focus:ring-white/50 focus:bg-white/30"
      : "bg-white text-gray-900 border-gray-200 focus:ring-[#0A1A44]/20 focus:border-[#0A1A44] shadow-sm";

    return (
      <div className="w-full space-y-2">
        <label
          className={`block text-left text-sm font-bold ml-1 ${labelColor}`}
        >
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            className={`w-full px-4 py-3 rounded-xl border appearance-none
              focus:outline-none focus:ring-2 transition-all 
              ${error ? "border-red-400" : ""} 
              ${baseStyles} ${className}`}
            {...props}
          >
            <option value="" disabled className="text-gray-500">
              Select {label}
            </option>
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="text-gray-800 bg-white"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isGlass ? "text-white/70" : "text-gray-500"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-red-600 text-xs ml-1 font-medium bg-red-50 p-1 rounded w-fit">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthSelect.displayName = "AuthSelect";
