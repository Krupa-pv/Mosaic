"use client";

import { useMemo, useState } from "react";
import type {
  ExtractionResponse,
  ResidentMatch,
  ResidentProfile,
  SocialPrescription,
} from "@shared/types";
import {
  extractCarePlan,
  extractIntake,
  findBestMatch,
  findCandidates,
  recommendEvent,
  type MatchCandidate,
} from "@/lib/api";
import { mergeProfile } from "@/lib/ui";
import CandidateList from "./CandidateList";
import ExtractionPane from "./ExtractionPane";
import ProfileCard from "./ProfileCard";
import RecommendationCard from "./RecommendationCard";

export default function ResidentWorkspace({
  residentId,
  residentName,
  initialCarePlanText,
  initialIntakeText,
}: {
  residentId: string;
  residentName: string;
  initialCarePlanText: string;
  initialIntakeText: string;
}) {
  // ---- Stage 2: extraction ----
  const [carePlanText, setCarePlanText] = useState(initialCarePlanText);
  const [intakeText, setIntakeText] = useState(initialIntakeText);
  const [carePlanResult, setCarePlanResult] = useState<ExtractionResponse | null>(null);
  const [intakeResult, setIntakeResult] = useState<ExtractionResponse | null>(null);
  const [carePlanLoading, setCarePlanLoading] = useState(false);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [carePlanCached, setCarePlanCached] = useState(false);
  const [intakeCached, setIntakeCached] = useState(false);

  // Edits made by staff to the merged profile win over the extraction.
  const [profileEdits, setProfileEdits] = useState<ResidentProfile | null>(null);

  // ---- Stages 3-4: matching + prescription ----
  const [match, setMatch] = useState<ResidentMatch | null>(null);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchCached, setMatchCached] = useState(false);
  const [prescription, setPrescription] = useState<SocialPrescription | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  const extracted = carePlanResult !== null || intakeResult !== null;

  const merged = useMemo(
    () => profileEdits ?? mergeProfile(residentId, carePlanResult, intakeResult),
    [profileEdits, residentId, carePlanResult, intakeResult]
  );

  async function runCarePlan() {
    setCarePlanLoading(true);
    const { data, source } = await extractCarePlan(residentId, carePlanText);
    setCarePlanResult(data);
    setCarePlanCached(source === "fallback");
    setProfileEdits(null);
    setCarePlanLoading(false);
  }

  async function runIntake() {
    setIntakeLoading(true);
    const { data, source } = await extractIntake(residentId, intakeText);
    setIntakeResult(data);
    setIntakeCached(source === "fallback");
    setProfileEdits(null);
    setIntakeLoading(false);
  }

  async function runMatch() {
    setMatchLoading(true);
    setPrescription(null);

    // Show the scored field and the winner together — the ranking is the
    // evidence that the pairing was chosen, not conjured.
    const [ranked, best] = await Promise.all([
      findCandidates(residentId, merged),
      findBestMatch(residentId, merged),
    ]);
    setCandidates(ranked.data);
    setMatch(best.data);
    setMatchCached(best.source === "fallback");
    setMatchLoading(false);

    const { data } = best;

    // The pair is only useful with somewhere to put them — chain straight
    // into the event recommendation so the card lands complete.
    setEventLoading(true);
    const rec = await recommendEvent(data);
    setPrescription(rec.data);
    setEventLoading(false);
  }

  function settle(status: "accepted" | "declined") {
    setPrescription((p) =>
      p ? { ...p, status, match: { ...p.match, status } } : p
    );
    setMatch((m) => (m ? { ...m, status } : m));
  }

  return (
    <>
      {/* ---- Step 2: build the profile ---- */}
      <section className="mt-12">
        <h2 className="display text-[26px] leading-tight text-ink">
          Understand who she is
        </h2>
        <p className="mt-1.5 max-w-prose text-[13.5px] leading-relaxed text-muted">
          Unstructured notes in, structured profile out. Nothing here was typed
          into a form by staff.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ExtractionPane
            title="Care plan"
            hint="clinical"
            value={carePlanText}
            onChange={setCarePlanText}
            onRun={runCarePlan}
            loading={carePlanLoading}
            result={carePlanResult}
            fallback={carePlanCached}
          />
          <ExtractionPane
            title="Intake note"
            hint="social · type or dictate"
            value={intakeText}
            onChange={setIntakeText}
            onRun={runIntake}
            loading={intakeLoading}
            result={intakeResult}
            fallback={intakeCached}
            allowVoice
          />
        </div>

        {extracted && (
          <ProfileCard profile={merged} onChange={setProfileEdits} />
        )}
      </section>

      {/* ---- Steps 3-4: match + prescribe ---- */}
      {extracted && (
        <section className="mt-14 pb-20">
          <h2 className="display text-[26px] leading-tight text-ink">
            Prescribe a connection
          </h2>
          <p className="mt-1.5 max-w-prose text-[13.5px] leading-relaxed text-muted">
            Mosaic scores every other resident against {residentName}&apos;s
            profile, then finds an activity that works for both.
          </p>

          {!match && (
            <button
              type="button"
              onClick={runMatch}
              disabled={matchLoading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-[13.5px] font-medium text-white transition hover:bg-accent-deep disabled:opacity-60"
            >
              {matchLoading && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
              )}
              {matchLoading
                ? "Scoring residents…"
                : `Find a companion for ${residentName}`}
            </button>
          )}

          {match && candidates.length > 0 && (
            <CandidateList
              candidates={candidates}
              selectedId={match.residentBId}
            />
          )}

          {match && (
            <RecommendationCard
              match={match}
              prescription={prescription}
              loadingEvent={eventLoading}
              fallback={matchCached}
              onAccept={() => settle("accepted")}
              onDecline={() => settle("declined")}
            />
          )}
        </section>
      )}
    </>
  );
}
