// ============================================================
// Assembles the single card the demo ends on:
//   resident + resident + event, with both explanations.
//
// This is the one function Dev B needs for the recommendation screen.
// ============================================================

import type { ResidentProfile, SocialEvent, SocialPrescription } from "../types";
import { scoreMatch, toResidentMatch } from "./matching/score-match";
import { recommendEvent, rejectedEvents, type EventFit } from "./matching/recommend-event";
import { explainMatch, explainEventFit } from "./ai/explain-match";

export interface PrescriptionInput {
  a: ResidentProfile;
  b: ResidentProfile;
  names: { a: string; b: string };
  events: SocialEvent[];
  /** Pre-verified copy used if the model call fails mid-recording. */
  fallbacks?: { rationale?: string; eventFitReason?: string };
}

export interface PrescriptionResult {
  prescription: SocialPrescription | null;
  /** Ranked alternatives, best first, excluding the chosen event. */
  alternatives: EventFit[];
  /** Events the hard filters removed, with reasons. Worth showing. */
  rejected: EventFit[];
  /** Set when the pair itself was rejected. */
  disqualifiers: string[];
}

export async function buildSocialPrescription({
  a,
  b,
  names,
  events,
  fallbacks,
}: PrescriptionInput): Promise<PrescriptionResult> {
  const match = scoreMatch(a, b);
  const rejected = rejectedEvents(a, b, events);

  if (!match.eligible) {
    return { prescription: null, alternatives: [], rejected, disqualifiers: match.disqualifiers };
  }

  const ranked = recommendEvent(a, b, events);
  const best = ranked[0];

  // Both explanations are independent, so ask for them at the same time.
  const [rationale, eventFitReason] = await Promise.all([
    explainMatch(a, b, match.score, match.components, names, fallbacks?.rationale),
    best
      ? explainEventFit(a, b, best.event, names, fallbacks?.eventFitReason)
      : Promise.resolve(""),
  ]);

  if (!best) {
    return {
      prescription: null,
      alternatives: [],
      rejected,
      disqualifiers: ["No accessible activity fits this pair"],
    };
  }

  const residentMatch = { ...toResidentMatch(a, b, match), rationale };

  return {
    prescription: {
      id: `${a.residentId}-${b.residentId}-${best.event.id}`,
      match: residentMatch,
      event: best.event,
      eventFitReason,
      status: "suggested",
    },
    alternatives: ranked.slice(1),
    rejected,
    disqualifiers: [],
  };
}
