"use client";

import { Button } from "@/components/ui/Button";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import HomeFooter from "./HomeFooter";
import Link from "next/link"; // 1. Import Link

export default function Hero() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Hero Background Area */}
      <section className="relative grow flex items-center justify-center pt-24 pb-16 md:pt-20">
        {/* Background Image Placeholder */}
        <div className="absolute inset-0 bg-gray-900">
          <div className="absolute inset-0 opacity-60 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] px-4 sm:px-8 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-4 md:mt-10">
          {/* Left Side: Title & CTA */}
          <div className="text-white space-y-4 md:space-y-6 text-center lg:text-left animate-in slide-in-from-bottom-10 duration-700">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight drop-shadow-lg font-serif">
              CoolStay
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 max-w-lg mx-auto lg:mx-0 drop-shadow-md hidden sm:block">
              Experience luxury and comfort in the heart of the city. Your
              perfect getaway awaits.
            </p>
            <div className="flex justify-center lg:justify-start pt-2">
              {/* 2. Wrap Button in Link */}
              <Link href="/accommodation">
                <Button
                  variant="primary"
                  rounded="full"
                  size="lg"
                  className="bg-[#0A1A44] hover:bg-[#0A1A44]/90 px-8 md:px-10 border border-white/20 h-12 md:h-14 text-base md:text-lg shadow-xl"
                >
                  Explore Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side: Calendar */}
          <div className="flex justify-center lg:justify-end w-full">
            {/* Wrapper ensures calendar doesn't overflow on small screens */}
            <div className="w-full max-w-md lg:max-w-full">
              <AvailabilityCalendar />
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
