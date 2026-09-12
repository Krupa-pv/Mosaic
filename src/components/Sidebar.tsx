"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, RotateCcw } from "lucide-react";
import { HEX } from "@/lib/ui";
import { signOut, useCurrentStaff } from "@/lib/session";
import { staffInitials, staffName } from "@/lib/staff";
import { resetDemoData } from "@/lib/reset";
import AccessGate from "./AccessGate";

// Every item here is a real page. No placeholder nav — a judge who
// clicks one during the demo has to land somewhere.
// Four, not five. "Connections" and "Week plan" both answered "how is
// the floor doing" and the plan page already embedded the map, so they
// are one page now.
const NAV = [
  { href: "/", label: "Today" },
  { href: "/residents", label: "Residents" },
  { href: "/floor", label: "Your floor" },
  { href: "/activities", label: "Activities" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const me = useCurrentStaff();

  return (
    <aside className="shrink-0 border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-r max-lg:border-b">
      <div className="flex h-full flex-col gap-8 p-5 max-lg:flex-row max-lg:items-center max-lg:gap-4 max-lg:py-3">
        {/* ---- Wordmark ---- */}
        <Link href="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="display text-[19px] leading-none text-ink">
            Mosaic
          </span>
        </Link>

        {/* ---- Nav ---- */}
        <nav className="flex flex-col gap-0.5 max-lg:hidden">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-[13.5px] transition ${
                  active
                    ? "bg-accent-soft font-medium text-accent-deep"
                    : "text-ink-soft hover:bg-line-soft"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ---- Facility ---- */}
        <div className="mt-auto flex flex-col gap-3 max-lg:mt-0 max-lg:ml-auto max-lg:flex-row max-lg:items-center">
          <AccessGate />
          <div className="border-t border-line pt-4 max-lg:border-0 max-lg:pt-0">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-micro font-semibold text-accent-deep"
              >
                {me ? staffInitials(me) : "MG"}
              </span>
              <span className="min-w-0 leading-tight max-lg:hidden">
                <span className="block truncate text-caption font-medium text-ink">
                  {me ? staffName(me) : "Maple Grove"}
                </span>
                <span className="block text-micro text-muted">
                  {me ? `${me.role} · Maple Grove` : "Care Center · Floor 2"}
                </span>
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 max-lg:mt-0 max-lg:ml-3">
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 text-micro text-muted transition hover:text-accent"
              >
                <LogOut aria-hidden className="h-3 w-3" strokeWidth={2} />
                Sign out
              </button>
              <button
                type="button"
                onClick={resetDemoData}
                title="Clear profiles, notes and schedules built in this browser"
                className="inline-flex items-center gap-1.5 text-micro text-muted transition hover:text-high"
              >
                <RotateCcw aria-hidden className="h-3 w-3" strokeWidth={2} />
                Reset demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* Four tiles, one offset — a mosaic, and a stand-in for the residents
   the product is trying to fit together. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <rect x="1" y="1" width="9.5" height="9.5" rx="2.5" fill={HEX.accent} />
      <rect x="13.5" y="1" width="9.5" height="9.5" rx="2.5" fill={HEX.accent} opacity="0.42" />
      <rect x="1" y="13.5" width="9.5" height="9.5" rx="2.5" fill={HEX.accent} opacity="0.42" />
      <rect x="13.5" y="13.5" width="9.5" height="9.5" rx="2.5" fill={HEX.high} />
    </svg>
  );
}
