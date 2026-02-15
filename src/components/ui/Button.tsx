import React from "react";

// Fixed the typo: ButtonHTMLAttributesXH -> ButtonHTMLAttributes
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
  rounded?: "default" | "full";
}

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  rounded = "default",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide";

  const variants = {
    primary: "bg-[#0A1A44] text-white hover:bg-[#0A1A44]/90 shadow-sm", // Deep Blue
    secondary: "bg-[#5D4037] text-white hover:bg-[#5D4037]/90", // Brown
    outline: "border-2 border-white text-white hover:bg-white/10",
    ghost: "hover:bg-gray-100 text-gray-700",
    white: "bg-white text-[#0A1A44] hover:bg-gray-100", // For Sign In button
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-6 py-2 text-sm",
    lg: "h-12 px-8 text-base",
  };

  const radius = {
    default: "rounded-md",
    full: "rounded-full", // For Pill shape buttons
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${radius[rounded]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
