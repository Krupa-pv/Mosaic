import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import AccessGate from "@/components/AccessGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kinwell — Facility OS",
  description:
    "Social-health intelligence for long-term care: detect isolation risk, understand residents, and prescribe the right social intervention.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f7f6f3] text-stone-900">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-semibold text-white"
              >
                K
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold tracking-tight">
                  Kinwell
                </span>
                <span className="block text-[11px] text-stone-500">
                  Maple Grove Care Center
                </span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <AccessGate />
              <span className="hidden h-8 w-8 place-items-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600 sm:grid">
                RN
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
