"use client";

import React, { useState, forwardRef } from "react";
import { Check, Eye, EyeOff, AlertCircle, LucideIcon } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isSuccess?: boolean;
  icon?: LucideIcon;
  variant?: "glass" | "outline"; // ✅ New Prop to control style
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      className = "",
      type = "text",
      error,
      isSuccess,
      icon: Icon,
      variant = "glass", // Default to glass for Login/Register
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    // --- VARIANT STYLING ---
    const isGlass = variant === "glass";
    const isRequired = Boolean(props.required);

    // Text Colors
    const labelColor = isGlass ? "text-white" : "text-[#0A1A44]";
    const iconColor = isGlass ? "text-blue-100/70" : "text-gray-400";
    const requiredColor = isGlass ? "text-red-200" : "text-red-500";

    // Input Box Colors
    const baseStyles = isGlass
      ? "bg-white/20 text-white placeholder-blue-100/50 focus:ring-white/50 focus:bg-white/30 border-white/20"
      : "bg-white text-gray-900 placeholder-gray-400 focus:ring-[#0A1A44]/20 focus:border-[#0A1A44] border-gray-200 shadow-sm";

    // Validation Colors
    let stateStyles = "";
    if (error) stateStyles = "border-red-400 ring-2 ring-red-400/20";
    else if (isSuccess)
      stateStyles = "border-green-400 ring-2 ring-green-400/20";

    return (
      <div className="w-full space-y-2">
        <label
          className={`text-left text-sm font-bold ml-1 flex justify-between ${labelColor}`}
        >
          <span>
            {label}
            {isRequired && <span className={`ml-1 ${requiredColor}`}>*</span>}
          </span>
        </label>

        <div className="relative group">
          {/* Left Icon */}
          {Icon && (
            <div
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 ${iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            className={`w-full ${Icon ? "pl-12" : "px-4"} pr-12 py-3 rounded-xl 
              focus:outline-none focus:ring-2 transition-all border
              ${baseStyles} ${stateStyles} ${className}`}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSuccess && !error && (
              <Check className="w-5 h-5 text-green-500 animate-in zoom-in" />
            )}
            {error && (
              <AlertCircle className="w-5 h-5 text-red-500 animate-in zoom-in" />
            )}

            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`${isGlass ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-gray-600"} transition-colors p-1`}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1 text-red-600 text-xs ml-1 font-medium bg-red-50 px-2 py-1 rounded w-fit animate-in slide-in-from-top-1">
            {error}
          </div>
        )}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
