import React from "react";
import { LucideIcon } from "lucide-react";

interface AuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
}

export const AuthButton = ({
  children,
  className = "",
  icon: Icon,
  ...props
}: AuthButtonProps) => (
  <button
    className={`w-full py-3 px-6 rounded-full bg-[#065FA3] hover:bg-[#054a80] text-white font-bold tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-white/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {Icon && <Icon className="w-5 h-5" />}
    {children}
  </button>
);
