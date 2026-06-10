import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AgeGate } from "@/components/age-gate";
import { LeadCapture } from "@/components/lead-capture";
import { Analytics } from "@/components/analytics";
import { Suspense } from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-wordmark", subsets: ["latin"], weight: ["600", "700"] });
const cormorant = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wanderlustwonderer.com";
const TITLE = "Wanderlust Wonderer — Mystery · Magic · Movement";
const DESCRIPTION =
  "Step through the portal into a private world of exclusive content, a companion that's always awake, live sessions and more. 18+ members club.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Wanderlust Wonderer",
  },
  description: DESCRIPTION,
  applicationName: "Wanderlust Wonderer",
  keywords: ["Wanderlust Wonderer", "members club", "exclusive content", "companion", "yoga", "creator"],
  authors: [{ name: "Wanderlust Wonderer" }],
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "Wanderlust Wonderer",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}<AgeGate /><LeadCapture /><Suspense fallback={null}><Analytics /></Suspense></body>
    </html>
  );
}
