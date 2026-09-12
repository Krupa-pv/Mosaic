"use client";

import { useState } from "react";
import { ChevronDown, FileText, NotebookPen } from "lucide-react";
import SourcePanel from "./SourcePanel";

/**
 * The documents behind a profile, folded away once they've been read.
 *
 * A care plan is a wall of clinical prose and an intake note is written
 * once at admission — neither is what staff come to this page for. The
 * profile is the standing artefact; these sit underneath it as "where
 * this came from", and open when something needs updating.
 */
export default function SourceStrip({
  carePlan,
  intake,
  defaultOpen,
}: {
  carePlan: React.ComponentProps<typeof SourcePanel>;
  intake: React.ComponentProps<typeof SourcePanel>;
  /** Open before anything has been extracted — there's nothing else yet. */
  defaultOpen: boolean;
}) {
  // Derived, not sticky: once both documents have been read the strip
  // folds itself away, so you land on the profile rather than on two
  // walls of clinical prose. A manual toggle overrides it from then on.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? defaultOpen;

  const rows = [
    {
      icon: FileText,
      label: "Care plan",
      status: carePlan.done ? "Read" : "Not read yet",
      note: "Clinical · updated at review",
      done: carePlan.done,
    },
    {
      icon: NotebookPen,
      label: "Intake note",
      status: intake.done ? "Read" : "Not read yet",
      note: "Written once, at admission",
      done: intake.done,
    },
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-raised">
      <button
        type="button"
        onClick={() => setOverride(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface"
      >
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">Source documents</p>
          <p className="mt-0.5 text-caption text-muted">
            Where this profile came from — open to update or add more.
          </p>
        </div>

        <div className="hidden gap-5 sm:flex">
          {rows.map((r) => (
            <span key={r.label} className="flex items-center gap-2">
              <r.icon
                aria-hidden
                className={`h-3.5 w-3.5 ${r.done ? "text-accent" : "text-faint"}`}
                strokeWidth={1.75}
              />
              <span className="text-micro text-muted">
                {r.label}
                <span className={r.done ? "text-accent" : "text-faint"}>
                  {" · "}
                  {r.status}
                </span>
              </span>
            </span>
          ))}
        </div>

        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="border-t border-line-soft bg-surface p-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <SourcePanel {...carePlan} />
            <SourcePanel {...intake} />
          </div>
          <p className="mt-3 text-micro text-muted">
            An intake note is written once at admission. Day-to-day changes
            arrive as notes from the end-of-day screen, below.
          </p>
        </div>
      )}
    </div>
  );
}
