import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Tracker 2026 | Google Cloud Skills Boost",
  description: "Monitor Google Skills Arcade milestones, badge points, and participants status in one premium developer dashboard.",
  openGraph: {
    title: "Arcade Tracker 2026 | Google Cloud Skills Boost",
    description: "Monitor Google Skills Arcade milestones, badge points, and participants status in one premium developer dashboard.",
    url: "https://github.com/fajrinTech/ArcadeTrack2026",
    siteName: "Arcade Tracker 2026",
    images: [
      {
        url: "/OpenGraph.png",
        width: 1200,
        height: 630,
        alt: "Arcade Tracker 2026 Preview",
      },
    ],
    type: "website",
  },
  icons: {
    icon: "/500px.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <main className="overflow-x-hidden w-full max-w-full relative z-10 flex-grow flex flex-col">
          <ToastProvider>
            {children}
          </ToastProvider>
        </main>
      </body>
    </html>
  );
}
