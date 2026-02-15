import type { Metadata } from "next";
import { Geist, Geist_Mono, Goblin_One } from "next/font/google";
import "./globals.css";
// 1. Import Toaster
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const goblinOne = Goblin_One({
  weight: "400",
  variable: "--font-goblin",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.coolstay.site"),

  title: "CoolStay",
  description: "Bulacan Great Escape",
  icons: {
    icon: "/images/logo/coolstayicon.png",
  },
  openGraph: {
    title: "CoolStay",
    description: "Bulacan Great Escape",
    url: "https://www.coolstay.site",
    siteName: "CoolStay",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${goblinOne.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
