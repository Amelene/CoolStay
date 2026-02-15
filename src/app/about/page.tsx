import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col bg-linear-to-b from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc]">
      <Navbar />

      {/* Main Content - Added pt-32 to account for the fixed navbar */}
      <section className="grow pt-32 pb-20 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text Content */}
          <div className="space-y-6 text-[#0A1A44]">
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight">
              Bulacan Great <br />
              <span className="ml-12 md:ml-24">Escape</span>
            </h1>

            <div className="space-y-4 text-lg md:text-xl leading-relaxed text-slate-800 font-light max-w-xl">
              <p>
                Experience a comfortable staycation with exciting amenities
                designed for relaxation and fun. Whether you are a traveler, a
                family looking to bond, or a corporate team seeking an escape,
                we have the perfect space for you.
              </p>
              <p>
                Enjoy a worry-free vacation that is budget-friendly and
                accessible. Immerse yourself in our relaxing ambiance, great
                scenery, and the thrill of our signature wave pool and raging
                river.
              </p>
            </div>
          </div>

          {/* Right Column: Image Collage */}
          <div className="relative">
            {/* Blue Background Card effect behind images */}
            <div className="bg-[#64B5F6]/30 rounded-3xl p-4 shadow-xl backdrop-blur-sm border border-white/20">
              <div className="grid grid-cols-2 gap-4 h-[500px]">
                {/* Left side: Stack of 2 images */}
                <div className="flex flex-col gap-4">
                  {/* Top Left: Entrance */}
                  <div className="relative h-1/2 w-full overflow-hidden rounded-xl shadow-md group">
                    <Image
                      src="/images/background/coolstaybg.png"
                      alt="Resort Entrance"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  {/* Bottom Left: Pool */}
                  <div className="relative h-1/2 w-full overflow-hidden rounded-xl shadow-md group">
                    <Image
                      src="/images/background/coolstaybg.png"
                      alt="Wave Pool"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                {/* Right side: 1 Tall Image */}
                <div className="relative h-full w-full overflow-hidden rounded-xl shadow-md group">
                  <Image
                    src="/images/background/coolstaybg.png"
                    alt="Resort Grounds"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reusable Footer */}
      <Footer />
    </main>
  );
}
