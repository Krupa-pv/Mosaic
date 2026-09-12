"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useFlowActions, useFlowResults } from "./ResidentFlowProvider";
import CandidateList from "../CandidateList";
import RecommendationCard from "../RecommendationCard";
import EmptyStep from "./EmptyStep";

export default function PairStep() {
  const r = useFlowResults();
  const a = useFlowActions();

  // Arriving here straight from the profile step, there's nothing to look
  // at until scoring runs — so run it rather than showing an empty page
  // with a button on it.
  useEffect(() => {
    if (r.extracted && !r.match && !r.matchLoading) a.runMatch();
  }, [r.extracted, r.match, r.matchLoading, a]);

  if (!r.extracted) {
    return (
      <EmptyStep
        title="Build the profile first"
        body={`Mosaic scores every other resident against ${r.residentName}'s interests, preferences and care needs — so it needs the profile before it can rank anyone.`}
        href={`/residents/${r.residentId}/profile`}
        cta="Go to profile"
      />
    );
  }

  return (
    <>
      <header>
        <h2 className="display text-title leading-tight text-ink">
          Prescribe a connection
        </h2>
        <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
          Every other resident on the floor, scored against{" "}
          {r.residentName}&apos;s profile.
        </p>
      </header>

      {r.matchLoading && !r.match && (
        <p className="mt-6 flex items-center gap-2.5 text-caption text-muted">
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent"
          />
          Scoring residents…
        </p>
      )}

      {r.match && r.candidates.length > 0 && (
        <CandidateList
          candidates={r.candidates}
          selectedId={r.match.residentBId}
          onChoose={(id) => a.runMatch(id)}
        />
      )}

      {r.match && (
        <>
          <RecommendationCard
            match={r.match}
            prescription={r.prescription}
            loadingEvent={r.eventLoading}
            fallback={r.matchCached}
          />
          {r.prescription && (
            <Link
              href={`/residents/${r.residentId}/schedule`}
              className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-caption font-medium text-white transition hover:bg-accent-deep"
            >
              See when they&apos;re free
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
          )}
        </>
      )}
    </>
  );
}
