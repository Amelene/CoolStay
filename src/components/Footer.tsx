import React from "react";

export default function Footer() {
  return (
    <footer className="bg-[#4E342E] text-[#D7CCC8] py-8 px-4 sm:px-8 border-t-4 border-[#3E2723]">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        {/* Address Section */}
        <div className="flex items-start gap-3">
          <div className="bg-white p-1.5 rounded-full mt-1 shrink-0">
            <svg
              className="w-4 h-4 text-[#4E342E]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-white uppercase mb-1">Address:</h4>
            <p>
              777 Libo Street, San Nicolas,
              <br />
              Bulakan, Bulacan Philippines
            </p>
          </div>
        </div>

        {/* Email & Reservations */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-white p-1.5 rounded-full mt-1 shrink-0">
              <svg
                className="w-4 h-4 text-[#4E342E]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <a
              href="mailto:reservations@coolwavesresort.com"
              className="hover:text-white transition-colors mt-1"
            >
              reservations@coolwavesresort.com
            </a>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-white p-1.5 rounded-full mt-1 shrink-0">
              <svg
                className="w-4 h-4 text-[#4E342E]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p>
                Booking Reservation is from
                <br />
                Mon-Sun 8:00 AM to 5:00 PM
              </p>
            </div>
          </div>
        </div>

        {/* Contact Numbers */}
        <div className="flex items-start gap-3">
          <div className="bg-white p-1.5 rounded-full mt-1 shrink-0">
            <svg
              className="w-4 h-4 text-[#4E342E]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p>
              <span className="font-bold text-white">Sun</span> 0943 568 1362
            </p>
            <p>
              <span className="font-bold text-white">Globe</span> 0905 397 6300
            </p>
            <p>
              <span className="font-bold text-white">Bulacan Line</span> +63
              (044) 792 2870
            </p>
            <p>
              <span className="font-bold text-white">Manila Line</span> +63 (02)
              404 4875
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
