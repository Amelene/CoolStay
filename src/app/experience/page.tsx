"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useState } from "react";

// Data for the different categories
const experienceContent = {
  water: [
    {
      title: "Helmet Diving",
      description: (
        <>
          <p>
            Dive into an unforgettable experience with our Helmet Diving
            adventure, where you can explore life 12 feet beneath the surface!
            This activity is perfect for the entire family.
          </p>
          <p>
            No need for advanced diving skills—if you can walk and breathe,
            you&apos;re all set! It&apos;s that simple.
          </p>
          <p>
            Helmet diving is a perfect basic step for those eyeing scuba diving
            and other underwater activities in the future.
          </p>
        </>
      ),
      image:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2070&auto=format&fit=crop",
    },
    {
      title: "Wave Pool & Raging River",
      description: (
        <>
          <p>
            Experience the thrill of the ocean right here at CoolStay. Our
            signature Wave Pool generates distinct wave patterns, from gentle
            rollers to exciting diamond waves, simulating a true beach vibe.
          </p>
          <p>
            Looking for relaxation? Grab a floater and let the current take you
            away on our Raging River, winding through the scenic landscape of
            the resort.
          </p>
        </>
      ),
      image:
        "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?q=80&w=2070&auto=format&fit=crop",
    },
  ],
  dining: [
    {
      title: "The Horizon Bistro",
      description: (
        <>
          <p>
            Savor exquisite local and international cuisine with a panoramic
            view of the resort. Our chefs use only the freshest locally sourced
            ingredients to create culinary masterpieces.
          </p>
          <p>
            Perfect for romantic dinners or family gatherings, The Horizon
            offers an ambiance that is both elegant and welcoming.
          </p>
        </>
      ),
      image:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop",
    },
    {
      title: "Poolside Tiki Bar",
      description: (
        <>
          <p>
            Refresh yourself with our signature cocktails and mocktails while
            soaking up the sun. The Poolside Tiki Bar is the heartbeat of our
            daytime entertainment.
          </p>
          <p>
            Don&apos;t miss our Happy Hour from 4 PM to 7 PM for special deals
            on drinks and appetizers!
          </p>
        </>
      ),
      image:
        "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2070&auto=format&fit=crop",
    },
  ],
  spa: [
    {
      title: "Serenity Spa & Wellness",
      description: (
        <>
          <p>
            Escape the stresses of daily life in our sanctuary of peace. We
            offer a range of treatments from Swedish massages to deep tissue
            therapy designed to rejuvenate your body and mind.
          </p>
          <p>
            Our therapists are certified experts dedicated to providing you with
            a personalized healing experience.
          </p>
        </>
      ),
      image:
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop",
    },
    {
      title: "Thermal Sauna Suites",
      description: (
        <>
          <p>
            Detoxify and relax in our state-of-the-art wooden sauna suites. The
            perfect way to end a day of swimming and activities.
          </p>
          <p>
            Access to the sauna is complimentary for all guests staying in our
            Suite and Villa accommodations.
          </p>
        </>
      ),
      image:
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=2070&auto=format&fit=crop",
    },
  ],
};

type TabKey = "water" | "dining" | "spa";

export default function ExperiencePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("water");

  return (
    <main className="min-h-screen bg-[#CBE4F9]">
      {/* 1. Navbar: Active "experience", Text Logo */}
      <Navbar activePage="experience" logoVariant="text" />

      <div className="pt-28 pb-20 px-4 sm:px-8 max-w-[1200px] mx-auto space-y-8">
        {/* 2. Header Card with Sub-Navigation */}
        <div className="relative bg-[#0077B6] rounded-3xl pt-16 pb-8 px-8 shadow-xl text-white text-center mt-12">
          {/* Floating Logo Icon */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden z-10">
            <Image
              src="/images/logo/coolstaylogo.jpg"
              alt="CoolStay logo"
              fill
              priority
              className="object-cover"
            />
          </div>

          {/* Sub-Navigation Menu */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm md:text-base font-medium tracking-wide mt-4">
            <button
              onClick={() => setActiveTab("water")}
              className={`relative pb-2 border-b-2 transition-all duration-200 ${
                activeTab === "water"
                  ? "border-white text-white"
                  : "border-transparent hover:border-white/50 text-blue-100 hover:text-white"
              }`}
            >
              Water Activity
            </button>
            <button
              onClick={() => setActiveTab("dining")}
              className={`relative pb-2 border-b-2 transition-all duration-200 ${
                activeTab === "dining"
                  ? "border-white text-white"
                  : "border-transparent hover:border-white/50 text-blue-100 hover:text-white"
              }`}
            >
              Restaurant Dining
            </button>
            <button
              onClick={() => setActiveTab("spa")}
              className={`relative pb-2 border-b-2 transition-all duration-200 ${
                activeTab === "spa"
                  ? "border-white text-white"
                  : "border-transparent hover:border-white/50 text-blue-100 hover:text-white"
              }`}
            >
              Spa
            </button>
            <button className="relative pb-2 border-b-2 border-transparent text-blue-200 cursor-default">
              Coming soon...
            </button>
          </div>
        </div>

        {/* 3. Dynamic Content */}
        <div className="space-y-8">
          {experienceContent[activeTab].map((item, index) => (
            <div
              key={index}
              className="bg-[#90C8EF] rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row gap-8 items-center border-2 border-[#0077B6]"
            >
              {/* Left: Image */}
              <div className="w-full md:w-1/3 relative h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Right: Text */}
              <div className="flex-1 text-[#0A1A44] space-y-4">
                <h2 className="text-3xl font-serif font-bold uppercase tracking-wider">
                  {item.title}
                </h2>
                <div className="space-y-4 text-sm md:text-base font-medium leading-relaxed opacity-90">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
