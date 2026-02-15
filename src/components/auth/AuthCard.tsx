import React from "react";
import Image from "next/image";

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  maxWidth?: string; // Allows customization like 'max-w-[480px]' vs 'max-w-[850px]'
}

export const AuthCard = ({
  children,
  title,
  subtitle,
  maxWidth = "max-w-[480px]",
}: AuthCardProps) => {
  return (
    <div
      className={`relative w-full ${maxWidth} p-8 md:p-12 rounded-4xl bg-[#0875D4]/50 backdrop-blur-lg shadow-2xl border border-white/20 flex flex-col items-center text-center ring-1 ring-white/10 mt-10`}
    >
      {/* FLOATING LOGO */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full border-4 border-white/80 shadow-lg overflow-hidden shrink-0 z-20">
        <Image
          src="/images/logo/coolstaylogo.jpg"
          alt="CoolStay Logo"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Header Section */}
      <div className="flex flex-col items-center mb-6 mt-12 space-y-4 max-w-2xl">
        <h1 className="text-xl md:text-3xl font-serif text-white leading-tight drop-shadow-md px-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-blue-100 text-sm md:text-base">{subtitle}</p>
        )}
      </div>

      {/* Content / Form */}
      <div className="w-full">{children}</div>
    </div>
  );
};
