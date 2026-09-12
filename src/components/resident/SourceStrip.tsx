"use client";

import { useState } from "react";
import { FileText, NotebookPen, X, type LucideIcon } from "lucide-react";
import SourcePanel from "./SourcePanel";

type PanelProps = React.ComponentProps<typeof SourcePanel>;

/**
 * Where the profile came from, as two status rows.
 *
 * The documents themselves are behind an explicit "Update" — a care
 * plan is a wall of clinical prose and an intake note is written once at
 * admission. Neither is what staff come to this page for, and leaving
 * two textareas on screen made the profile read as a form.
 */
export default function SourceStrip({
  carePlan,
  intake,
}: {
  carePlan: PanelProps;
  intake: PanelProps;
}) {
  const [open, setOpen] = useState<"carePlan" | "intake" | null>(null);

  const rows: {
    key: "carePlan" | "intake";
    icon: LucideIcon;
    label: string;
    meta: string;
    props: PanelProps;
  }[] = [
    {
      key: "carePlan",
      icon: FileText,
      label: "Care plan",
      meta: "Clinical · updated at review",
      props: carePlan,
    },
    {
      key: "intake",
      icon: NotebookPen,
      label: "Intake note",
      meta: "Written once, at admission",
      props: intake,
    },
  ];

  const active = rows.find((r) => r.key === open);

  return (
    <>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={r.key}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-raised px-5 py-3.5"
          >
            <r.icon
              aria-hidden
              className={`h-4 w-4 shrink-0 ${r.props.done ? "text-accent" : "text-faint"}`}
              strokeWidth={1.75}
            />
            <div className="min-w-0 flex-1">
              <p className="text-body text-ink">{r.label}</p>
              <p className="text-micro text-muted">{r.meta}</p>
            </div>
            <span
              className={`text-caption ${r.props.done ? "text-accent" : "text-faint"}`}
            >
              {r.props.done ? "Read" : "Not read yet"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(r.key)}
              className="rounded-lg bg-raised px-3.5 py-2 text-caption font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-surface"
            >
              {r.props.done ? "Update" : "Add"}
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Update ${active.label}`}
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl bg-paper p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="display text-title text-ink">{active.label}</h3>
                <p className="mt-1 text-caption text-muted">
                  {active.key === "carePlan"
                    ? "Upload or paste the current care plan. Mosaic reads it into the profile — it never overwrites an edit you've made by hand."
                    : "The admission note. Day-to-day changes belong in daily notes rather than here."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-line-soft hover:text-ink"
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <SourcePanel
              {...active.props}
              onRun={() => {
                active.props.onRun();
                setOpen(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
