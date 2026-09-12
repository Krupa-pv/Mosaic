"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HEX } from "@/lib/ui";
import AccessGate from "./AccessGate";

// Every item here is a real page. No placeholder nav — a judge who
// clicks one during the demo has to land somewhere.
const NAV = [
  { href: "/", label: "Today" },
  { href: "/residents", label: "Residents" },
  { href: "/activities", label: "Activities" },
];

export default function Sidebar() {
  const pathname = usePathname();

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
          <div className="flex items-center gap-2.5 border-t border-line pt-4 max-lg:border-0 max-lg:pt-0">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-line text-[11px] font-semibold text-ink-soft"
            >
              MG
            </span>
            <span className="leading-tight max-lg:hidden">
              <span className="block text-[12.5px] font-medium text-ink">
                Maple Grove
              </span>
              <span className="block text-[11px] text-muted">
                Care Center · Floor 2
              </span>
            </span>
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
