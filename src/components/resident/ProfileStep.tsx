"use client";

import Link from "next/link";
import { ArrowRight, FileStack, NotebookPen } from "lucide-react";
import { useFlowActions, useFlowDocs, useFlowResults } from "./ResidentFlowProvider";
import { SENTIMENT_LABELS, useObservations } from "@/lib/observations";
import ProfileCard from "../ProfileCard";
import SectionHeader from "../ui/SectionHeader";
import ProfileSuggestions from "./ProfileSuggestions";
import SourceStrip from "./SourceStrip";

export default function ProfileStep() {
  const { carePlanText, intakeText } = useFlowDocs();
  const r = useFlowResults();
  const a = useFlowActions();
  const notes = useObservations(r.residentId);

  return (
    <>
      <header>
        <h2 className="display text-title leading-tight text-ink">Who she is</h2>
        <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
          {r.extracted
            ? "The standing profile. Edit anything directly — it feeds every match and every suggestion."
            : "Read her care plan and intake note to build a profile. Nothing here gets typed into a form by staff."}
        </p>
      </header>

      {/* The profile is the artefact; the documents sit under it. */}
      {r.extracted && (
        <>
          <ProfileCard
            profile={r.merged}
            onChange={a.setProfileEdits}
            revealedAt={r.revealedAt}
          />
          <ProfileSuggestions
            residentId={r.residentId}
            profile={r.merged}
            onApply={a.setProfileEdits}
          />
        </>
      )}

      <SectionHeader
        icon={FileStack}
        title="Sources"
        hint="where this came from"
        className="mt-8"
      />
      <SourceStrip
        carePlan={{
          title: "Care plan",
          hint: "clinical · upload or paste",
          value: carePlanText,
          onChange: a.setCarePlanText,
          onRun: a.runCarePlan,
          loading: r.carePlanLoading,
          done: r.carePlanResult !== null,
          allowUpload: true,
        }}
        intake={{
          title: "Intake note",
          hint: "written at admission",
          value: intakeText,
          onChange: a.setIntakeText,
          onRun: a.runIntake,
          loading: r.intakeLoading,
          done: r.intakeResult !== null,
          allowVoice: true,
        }}
      />

      {/* The stream that actually changes over time. */}
      <section className="mt-6">
        <SectionHeader
          icon={NotebookPen}
          title="Daily notes"
          hint={notes.length > 0 ? `${notes.length} logged` : "from end of day"}
        />
        {notes.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface p-6 text-caption leading-relaxed text-muted">
            Nothing logged yet. Notes written on the end-of-day screen land
            here, and Mosaic reads them back to suggest profile updates — an
            interest mentioned repeatedly, or a group setting that keeps not
            working.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notes.slice(0, 8).map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-line bg-raised px-5 py-3.5"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={`text-micro font-medium ${
                      n.sentiment === "went_well"
                        ? "text-low"
                        : n.sentiment === "follow_up"
                          ? "text-mid"
                          : "text-muted"
                    }`}
                  >
                    {SENTIMENT_LABELS[n.sentiment]}
                  </span>
                  <span className="text-micro text-faint">
                    {new Date(n.at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-caption leading-relaxed text-ink-soft">
                  {n.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {r.extracted && (
        <Link
          href={`/residents/${r.residentId}/pair`}
          className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-caption font-medium text-white transition hover:bg-accent-deep"
        >
          Find a companion for {r.residentName}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Link>
      )}
    </>
  );
}
