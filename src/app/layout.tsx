import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Boot from "@/components/Boot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mosaic — Facility OS",
  description:
    "Social-health intelligence for long-term care: detect isolation risk, understand residents, and prescribe the right social intervention.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <Boot>
          <div className="min-h-screen lg:flex">
            <Sidebar />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </Boot>
      </body>
    </html>
  );
}
