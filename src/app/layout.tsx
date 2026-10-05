import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Serif, JetBrains_Mono, Martian_Mono } from "next/font/google";
import "./globals.css";

const display = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: "variable" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: "variable" });
const martian = Martian_Mono({ subsets: ["latin"], variable: "--font-martian", weight: "variable" });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument", weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://dignifyd.io"),
  openGraph: {
    title: "Dignifyd Group · One Relationship. Five Specialised Capabilities.",
    description: "Technology, talent, digital, enterprise infrastructure and data, delivered across 35+ countries.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Dot-matrix globe with Dignifyd's six capability centres" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  title: "Dignifyd Group · One Relationship. Five Specialised Capabilities.",
  description:
    "Dignifyd Group. One relationship, five specialised capabilities. Technology, talent, digital, enterprise infrastructure and data, delivered across 35+ countries.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${martian.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
