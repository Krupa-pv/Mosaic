"use client";

import { CircleCheck, Lightbulb, NotebookPen, TriangleAlert } from "lucide-react";
import { SENTIMENT_LABELS, useObservations } from "@/lib/observations";
import { byDay, digest } from "@/lib/digest";
import { useFlowActions, useFlowResults } from "./ResidentFlowProvider";
import ProfileSuggestions from "./ProfileSuggestions";
import SectionHeader from "../ui/SectionHeader";

/**
 * Everything staff have said about this resident, day by day, with the
 * recurring points pulled out at the top.
 *
 * Nobody reads three weeks of one-line notes. The digest is what a
 * handover actually needs — what keeps coming up, and what keeps not
 * working — and it's computed deterministically so it's never blank.
 */
export default function HistoryStep() {
  const r = useFlowResults();
  const a = useFlowActions();
  const notes = useObservations(r.residentId);
  const points = digest(notes);
  const days = byDay(notes);

  if (notes.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface p-7">
        <h2 className="display text-lead text-ink">No history yet</h2>
        <p className="mt-2 max-w-prose text-body leading-relaxed text-ink-soft">
          Each evening, whoever is assigned to {r.residentName} leaves a line
          about how the day went. Those notes collect here, and Mosaic pulls
          out what keeps coming up — so the next person on shift doesn&apos;t
          have to read three weeks of them.
        </p>
      </section>
    );
  }

  return (
    <>
      <header>
        <h2 className="display text-title leading-tight text-ink">
          What staff have noticed
        </h2>
        <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
          {notes.length} notes across {days.length}{" "}
          {days.length === 1 ? "day" : "days"}, condensed.
        </p>
      </header>

      {points.length > 0 && (
        <section className="mt-5">
          <SectionHeader icon={Lightbulb} title="Main points" hint="recurring across notes" />
          <ul className="mt-3 space-y-2">
            {points.map((p) => (
              <li
                key={p.text}
                className={`flex items-start gap-3 rounded-xl border px-5 py-3.5 ${
                  p.tone === "watch"
                    ? "border-mid/40 bg-mid-soft/50"
                    : "border-accent/30 bg-accent-soft/40"
                }`}
              >
                {p.tone === "watch" ? (
                  <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-mid" strokeWidth={2} />
                ) : (
                  <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                )}
                <p className="text-body leading-relaxed text-ink">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.extracted && (
        <ProfileSuggestions
          residentId={r.residentId}
          profile={r.merged}
          onApply={a.setProfileEdits}
        />
      )}

      <section className="mt-8">
        <SectionHeader icon={NotebookPen} title="Day by day" hint={`${notes.length} notes`} />
        <ol className="mt-3 space-y-4">
          {days.map((d) => (
            <li key={d.day}>
              <p className="text-micro tracking-wide text-muted uppercase">
                {new Date(d.at).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <ul className="mt-2 space-y-2">
                {d.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-line bg-raised px-5 py-3.5"
                  >
                    <span
                      className={`text-micro font-medium ${
                        n.sentiment === "went_well"
                          ? "text-low"
                          : n.sentiment === "follow_up"
                            ? "text-mid"
                            : n.sentiment === "didnt_happen"
                              ? "text-high"
                              : "text-muted"
                      }`}
                    >
                      {SENTIMENT_LABELS[n.sentiment]}
                    </span>
                    <p className="mt-1 text-caption leading-relaxed text-ink-soft">
                      {n.text}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
