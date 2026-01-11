import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

export default function DayPassPage() {
  return (
    <main className="min-h-screen bg-[#CBE4F9]">
      {/* Navbar with Text Logo */}
      <Navbar activePage="day-pass" logoVariant="text" />

      <div className="pt-28 pb-20 px-4 sm:px-8 max-w-[1000px] mx-auto space-y-8">
        {/* Header Card with Floating Logo */}
        <div className="relative bg-[#0077B6] rounded-3xl p-8 shadow-xl text-white text-center mt-12">
          {/* Floating Logo Icon (Since nav is text, this is the main visual logo) */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden z-10">
            <Image
              src="/images/logo/coolstaylogo.jpg"
              alt="CoolStay logo"
              fill
              priority
              className="object-cover"
            />
          </div>

          <h1 className="text-4xl font-serif font-bold uppercase tracking-widest mt-8">
            Day Pass
          </h1>
        </div>

        {/* ... (Rest of your Day Pass content remains the same) ... */}

        <div className="bg-[#90C8EF] border-2 border-[#0077B6] rounded-3xl p-8 md:p-12 shadow-md text-center text-[#0A1A44]">
          <h2 className="text-3xl font-serif font-bold mb-6">
            Experience a blissful slice of paradise
          </h2>
          <div className="space-y-4 text-sm md:text-base font-medium leading-relaxed max-w-3xl mx-auto">
            <p>
              Immerse yourself in our vast swimming pool, or engage in thrilling
              water-based activities.
            </p>
            <p>
              From 6am to 6pm, indulge in our diverse amenities without the need
              for a room booking. Every moment at CoolWaves promises a day of
              unforgettable leisure and adventure.
            </p>
            <p>
              Join us and immerse yourself in a tropical getaway that&apos;s
              yours to enjoy for the day.
            </p>
          </div>
          <div className="mt-8 space-y-1 text-xs md:text-sm text-slate-700 opacity-80">
            <p>
              *Facilities may close due to weather conditions. • Additional Fees
              may apply on site.
            </p>
            <p>Day Pass is valid from 07:00 AM to 08:00 PM</p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
