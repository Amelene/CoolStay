"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

// Types
interface Activity {
  id: string;
  name: string;
  description: string;
  price_per_person: number;
  duration_minutes: number;
  max_participants: number;
  image_url: string;
  is_active: boolean;
}

// Data for the other categories (dining, spa)
const experienceContent = {
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
  const [waterActivities, setWaterActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch water activities from database
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("activities")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setWaterActivities(data || []);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" />
            </div>
          ) : activeTab === "water" ? (
            // Water Activities from Database
            waterActivities.length > 0 ? (
              waterActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-[#90C8EF] rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row gap-8 items-center border-2 border-[#0077B6]"
                >
                  {/* Left: Image */}
                  <div className="w-full md:w-1/3 relative h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20">
                    <Image
                      src={activity.image_url}
                      alt={activity.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Right: Text */}
                  <div className="flex-1 text-[#0A1A44] space-y-4">
                    <h2 className="text-3xl font-serif font-bold uppercase tracking-wider">
                      {activity.name}
                    </h2>
                    <div className="space-y-4 text-sm md:text-base font-medium leading-relaxed opacity-90">
                      <p>{activity.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="bg-white/50 px-4 py-2 rounded-lg font-bold">
                          ₱{activity.price_per_person.toLocaleString()} per person
                        </span>
                        <span className="bg-white/50 px-4 py-2 rounded-lg font-bold">
                          {activity.duration_minutes} minutes
                        </span>
                        <span className="bg-white/50 px-4 py-2 rounded-lg font-bold">
                          Max {activity.max_participants} participants
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-[#0A1A44]">
                <p className="text-lg font-medium">No water activities available at the moment.</p>
              </div>
            )
          ) : (
            // Other categories (dining, spa) - hardcoded content
            experienceContent[activeTab].map((item, index) => (
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
            ))
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
