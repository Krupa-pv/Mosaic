"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFlowResults } from "./ResidentFlowProvider";

/**
 * Steps, not just tabs — each one is gated on the previous producing
 * something, so the order reads as a workflow rather than a filing
 * cabinet. A locked step still renders (never a dead end); it just says
 * what has to happen first.
 */
export default function ResidentTabs({ residentId }: { residentId: string }) {
  const pathname = usePathname();
  const { extracted } = useFlowResults();
  const base = `/residents/${residentId}`;

  const tabs = [
    { href: base, label: "Overview", ready: true },
    { href: `${base}/profile`, label: "Profile", ready: true },
    { href: `${base}/pair`, label: "Companion", ready: extracted },
    { href: `${base}/schedule`, label: "Schedule", ready: true },
    { href: `${base}/history`, label: "History", ready: true },
  ];

  return (
    <nav className="mb-8 flex gap-1 border-b border-line" aria-label="Resident sections">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-caption transition ${
              active
                ? "border-accent font-medium text-accent-deep"
                : t.ready
                  ? "border-transparent text-ink-soft hover:text-accent"
                  : "border-transparent text-faint"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
