"use client";

import {
  useFlowActions,
  useFlowDocs,
  useFlowResults,
} from "./resident/ResidentFlowProvider";
import CandidateList from "./CandidateList";
import ExtractionPane from "./ExtractionPane";
import ProfileCard from "./ProfileCard";
import RecommendationCard from "./RecommendationCard";

/**
 * The whole flow on one page. State now lives in ResidentFlowProvider
 * (in the layout) rather than here, so the next phase can split these
 * sections across subpages without losing anything.
 */
export default function ResidentWorkspace() {
  const { carePlanText, intakeText } = useFlowDocs();
  const r = useFlowResults();
  const a = useFlowActions();

  return (
    <>
      {/* ---- Step 2: build the profile ---- */}
      <section className="mt-12">
        <h2 className="display text-title leading-tight text-ink">
          Understand who she is
        </h2>
        <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
          Unstructured notes in, structured profile out. Nothing here was typed
          into a form by staff.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ExtractionPane
            title="Care plan"
            hint="clinical"
            value={carePlanText}
            onChange={a.setCarePlanText}
            onRun={a.runCarePlan}
            loading={r.carePlanLoading}
            result={r.carePlanResult}
            fallback={r.carePlanCached}
          />
          <ExtractionPane
            title="Intake note"
            hint="social · type or dictate"
            value={intakeText}
            onChange={a.setIntakeText}
            onRun={a.runIntake}
            loading={r.intakeLoading}
            result={r.intakeResult}
            fallback={r.intakeCached}
            allowVoice
          />
        </div>

        {r.extracted && (
          <ProfileCard profile={r.merged} onChange={a.setProfileEdits} />
        )}
      </section>

      {/* ---- Steps 3-4: match + prescribe ---- */}
      {r.extracted && (
        <section className="mt-14 pb-20">
          <h2 className="display text-title leading-tight text-ink">
            Prescribe a connection
          </h2>
          <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
            Mosaic scores every other resident against {r.residentName}&apos;s
            profile, then finds an activity that works for both.
          </p>

          {!r.match && (
            <button
              type="button"
              onClick={() => a.runMatch()}
              disabled={r.matchLoading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-caption font-medium text-white transition hover:bg-accent-deep disabled:opacity-60"
            >
              {r.matchLoading && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
              )}
              {r.matchLoading
                ? "Scoring residents…"
                : `Find a companion for ${r.residentName}`}
            </button>
          )}

          {r.match && r.candidates.length > 0 && (
            <CandidateList
              candidates={r.candidates}
              selectedId={r.match.residentBId}
            />
          )}

          {r.match && (
            <RecommendationCard
              match={r.match}
              prescription={r.prescription}
              loadingEvent={r.eventLoading}
              fallback={r.matchCached}
              onAccept={() => a.settle("accepted")}
              onDecline={() => a.settle("declined")}
            />
          )}
        </section>
      )}
    </>
  );
}
