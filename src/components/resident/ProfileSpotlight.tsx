"use client";

import Link from "next/link";
import { ArrowRight, FileUp, Mic, Sparkles } from "lucide-react";
import { useFlowResults } from "./ResidentFlowProvider";

/**
 * Building the profile is the thing that makes everything else work, so
 * it gets the loudest card on the overview — loudest of all when there
 * isn't one yet.
 */
export default function ProfileSpotlight({ residentId, firstName }: { residentId: string; firstName: string }) {
  const { needsProfile, merged, extracted } = useFlowResults();

  if (needsProfile) {
    return (
      <section className="kw-rise mt-6 overflow-hidden rounded-2xl border-2 border-accent bg-accent-soft/50">
        <div className="p-7">
          <p className="eyebrow text-accent">Start here</p>
          <h2 className="display mt-2 text-title text-ink">
            Build {firstName}&apos;s social profile
          </h2>
          <p className="mt-2 max-w-prose text-body leading-relaxed text-ink-soft">
            Nothing on file yet. Upload a care plan or talk it through — Mosaic
            turns it into interests, preferences and constraints, and every
            suggestion on this page gets sharper the moment it exists.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/residents/${residentId}/profile`}
              className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-body font-medium text-white transition hover:bg-accent-deep"
            >
              <FileUp aria-hidden className="h-4 w-4" strokeWidth={2} />
              Upload a care plan
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
            <Link
              href={`/residents/${residentId}/profile`}
              className="inline-flex items-center gap-2 rounded-xl bg-raised px-5 py-3 text-body font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-surface"
            >
              <Mic aria-hidden className="h-4 w-4" strokeWidth={2} />
              Dictate it instead
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!extracted) return null;

  return (
    <Link
      href={`/residents/${residentId}/profile`}
      className="group mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-accent/30 bg-accent-soft/40 p-6 transition hover:border-accent"
    >
      <Sparkles aria-hidden className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-ink">
          Profile on file — {merged.interests.slice(0, 3).join(", ")}
          {merged.interests.length > 3 && ` +${merged.interests.length - 3}`}
        </p>
        <p className="mt-1 text-caption leading-relaxed text-muted">
          Open it to update from a new care plan, or correct anything that has
          changed.
        </p>
      </div>
      <ArrowRight
        aria-hidden
        className="h-4 w-4 shrink-0 text-accent transition group-hover:translate-x-0.5"
        strokeWidth={2}
      />
    </Link>
  );
}
