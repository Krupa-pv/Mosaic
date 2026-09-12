// ============================================================
// Deterministic resident-to-resident compatibility scoring.
//
// No LLM is involved here, by design. The pipeline is:
//   hard filters  ->  weighted component scores  ->  0-100 score
// explainMatch() later turns these components into prose, but it
// never changes the number. That separation is the honest answer
// to "isn't this just an LLM guessing".
// ============================================================

import { countShared, saturate } from "./interests";
import type {
  Cognition,
  GroupSize,
  MatchComponents,
  Mobility,
  ResidentMatch,
  ResidentProfile,
  SensoryLevel,
} from "../../types";

// ---- Weights -------------------------------------------------
// Taken from the product spec's pairwise compatibility formula:
//   25 interests / 15 social / 15 care / 15 schedule
//   / 10 personality / 10 complementary / 10 previous outcomes
//
// The outcomes term needs the feedback loop, which is explicitly out of
// scope for this build, so its 10 points are redistributed proportionally
// across the six components we can actually compute. Restoring it later
// means adding the component back and deleting the renormalisation.

const SPEC_WEIGHTS: Record<keyof MatchComponents, number> = {
  interests: 25,
  socialPreferences: 15,
  careCompatibility: 15,
  schedule: 15,
  personality: 10,
  complementaryTraits: 10,
};

const SPEC_TOTAL = Object.values(SPEC_WEIGHTS).reduce((a, b) => a + b, 0); // 90, not 100

export const MATCH_WEIGHTS: Record<keyof MatchComponents, number> = Object.fromEntries(
  Object.entries(SPEC_WEIGHTS).map(([key, value]) => [key, value / SPEC_TOTAL]),
) as Record<keyof MatchComponents, number>;

export interface MatchResult {
  /** false when a hard filter rejected the pair — score is then 0. */
  eligible: boolean;
  score: number; // 0-100, rounded
  components: MatchComponents;
  /** Human-readable reasons the pair was rejected. Empty when eligible. */
  disqualifiers: string[];
}

// ---- Small helpers -------------------------------------------

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

// ---- Hard filters --------------------------------------------
// These reject a pair outright. A staff member should never be
// shown a suggestion that fails one of these, regardless of how
// well the pair scores on everything else.

export function hardFilters(a: ResidentProfile, b: ResidentProfile): string[] {
  const reasons: string[] = [];

  if (a.residentId === b.residentId) {
    reasons.push("Cannot match a resident with themselves");
  }

  if (a.careNeeds.supervisionRequired && b.careNeeds.supervisionRequired) {
    reasons.push("Both residents require supervision — pair cannot be left unaccompanied");
  }

  if (
    a.careNeeds.cognition === "moderate_impairment" &&
    b.careNeeds.cognition === "moderate_impairment"
  ) {
    reasons.push("Both residents have moderate cognitive impairment — neither can anchor the interaction");
  }

  if (a.careNeeds.hearing === "severe" && b.careNeeds.hearing === "severe") {
    reasons.push("Both residents have severe hearing impairment — conversation is not viable");
  }

  const dayA = a.preferredTimeOfDay;
  const dayB = b.preferredTimeOfDay;
  if ((dayA === "morning" && dayB === "evening") || (dayA === "evening" && dayB === "morning")) {
    reasons.push("Opposite ends of the day — no shared window of good energy");
  }

  return reasons;
}

// ---- Component: interests ------------------------------------

export function scoreInterests(a: ResidentProfile, b: ResidentProfile): number {
  return clamp(saturate(countShared(a.interests, b.interests)));
}

// ---- Component: social preferences ---------------------------

const GROUP_ORDER: GroupSize[] = ["one_on_one", "small", "large"];

export function scoreSocialPreferences(a: ResidentProfile, b: ResidentProfile): number {
  const ga = a.socialPreferences.preferredGroupSize;
  const gb = b.socialPreferences.preferredGroupSize;
  if (!ga || !gb) return 70; // unknown — neutral, don't reward or punish
  const gap = Math.abs(GROUP_ORDER.indexOf(ga) - GROUP_ORDER.indexOf(gb));
  if (gap === 0) return 100;
  if (gap === 1) return 60;
  return 25;
}

// ---- Component: care compatibility ---------------------------
// Penalty-based. The guiding idea is that a difference is only a
// problem when it stops the two from doing the same thing at the
// same pace, or when *neither* resident can compensate.

const MOBILITY_ORDER: Mobility[] = ["independent", "cane", "walker", "wheelchair"];
const SENSORY_ORDER: SensoryLevel[] = ["normal", "mild", "moderate", "severe"];
const COGNITION_ORDER: Cognition[] = ["intact", "mild_impairment", "moderate_impairment"];

const impaired = (level: SensoryLevel | undefined) =>
  level !== undefined && SENSORY_ORDER.indexOf(level) >= 2;

export function scoreCareCompatibility(a: ResidentProfile, b: ResidentProfile): number {
  let penalty = 0;

  // Mismatched mobility means mismatched pace.
  const ma = a.careNeeds.mobility;
  const mb = b.careNeeds.mobility;
  if (ma && mb) {
    penalty += Math.abs(MOBILITY_ORDER.indexOf(ma) - MOBILITY_ORDER.indexOf(mb)) * 6;
  }

  // Two high fall risks together need staff presence a pairing can't assume.
  if (a.careNeeds.fallRisk === "high" && b.careNeeds.fallRisk === "high") penalty += 10;

  // Cognition: only penalised when neither can anchor, or the gap is wide.
  const ca = a.careNeeds.cognition;
  const cb = b.careNeeds.cognition;
  if (ca && cb) {
    const ia = COGNITION_ORDER.indexOf(ca);
    const ib = COGNITION_ORDER.indexOf(cb);
    if (ia >= 1 && ib >= 1) penalty += 5 + (ia + ib - 2) * 4; // both impaired
    else if (Math.max(ia, ib) === 2) penalty += 8; // moderate paired with intact
  }

  // Sensory: fine if one side is unimpaired and can carry the exchange.
  if (impaired(a.careNeeds.hearing) && impaired(b.careNeeds.hearing)) penalty += 15;
  else if (impaired(a.careNeeds.hearing) || impaired(b.careNeeds.hearing)) penalty += 3;
  if (impaired(a.careNeeds.vision) && impaired(b.careNeeds.vision)) penalty += 5;

  // One-sided supervision is a staffing cost, not a blocker.
  if (a.careNeeds.supervisionRequired !== b.careNeeds.supervisionRequired) penalty += 5;

  return clamp(100 - penalty);
}

// ---- Component: schedule -------------------------------------

const DAY_ORDER = ["morning", "afternoon", "evening"] as const;

export function scoreSchedule(a: ResidentProfile, b: ResidentProfile): number {
  const da = a.preferredTimeOfDay;
  const db = b.preferredTimeOfDay;
  if (!da || !db) return 70;
  const gap = Math.abs(DAY_ORDER.indexOf(da) - DAY_ORDER.indexOf(db));
  if (gap === 0) return 100;
  if (gap === 1) return 55;
  return 0; // already caught by the hard filter
}

// ---- Component: personality ----------------------------------
// Deliberately NOT similarity. Two equally withdrawn residents
// produce a stalled conversation. A moderate gap is the target:
// one person comfortable carrying it, one comfortable following.

const IDEAL_INTROVERSION_GAP = 0.35;

export function scorePersonality(a: ResidentProfile, b: ResidentProfile): number {
  const gap = Math.abs(a.personality.introversion - b.personality.introversion);
  let score = 100 - 100 * Math.abs(gap - IDEAL_INTROVERSION_GAP);

  if (a.personality.introversion > 0.65 && b.personality.introversion > 0.65) score -= 20;
  if (a.personality.introversion < 0.2 && b.personality.introversion < 0.2) score -= 10;

  return clamp(score);
}

// ---- Component: complementary traits -------------------------
// The "Helen is welcoming while Margaret is withdrawing" signal.

const STYLE_PAIRS: Record<string, number> = {
  "quiet|talkative": 100,
  "balanced|quiet": 85,
  "balanced|talkative": 80,
  "balanced|balanced": 70,
  "talkative|talkative": 50,
  "quiet|quiet": 30,
};

export function scoreComplementaryTraits(a: ResidentProfile, b: ResidentProfile): number {
  const sa = a.personality.conversationalStyle;
  const sb = b.personality.conversationalStyle;
  if (!sa || !sb) return 65;
  const key = [sa, sb].sort().join("|");
  return STYLE_PAIRS[key] ?? 65;
}

// ---- Top-level scorer ----------------------------------------

export function scoreMatch(a: ResidentProfile, b: ResidentProfile): MatchResult {
  const components: MatchComponents = {
    interests: Math.round(scoreInterests(a, b)),
    socialPreferences: Math.round(scoreSocialPreferences(a, b)),
    careCompatibility: Math.round(scoreCareCompatibility(a, b)),
    schedule: Math.round(scoreSchedule(a, b)),
    personality: Math.round(scorePersonality(a, b)),
    complementaryTraits: Math.round(scoreComplementaryTraits(a, b)),
  };

  const disqualifiers = hardFilters(a, b);
  if (disqualifiers.length > 0) {
    return { eligible: false, score: 0, components, disqualifiers };
  }

  const weighted = (Object.keys(MATCH_WEIGHTS) as (keyof MatchComponents)[]).reduce(
    (sum, key) => sum + components[key] * MATCH_WEIGHTS[key],
    0,
  );

  return {
    eligible: true,
    score: Math.round(clamp(weighted)),
    components,
    disqualifiers: [],
  };
}

// ---- Ranking -------------------------------------------------

export interface RankedMatch extends MatchResult {
  candidate: ResidentProfile;
}

/** Eligible candidates only, best first. Drives the "best match" card. */
export function rankMatches(
  subject: ResidentProfile,
  candidates: ResidentProfile[],
): RankedMatch[] {
  return candidates
    .map((candidate) => ({ candidate, ...scoreMatch(subject, candidate) }))
    .filter((r) => r.eligible)
    .sort((x, y) => y.score - x.score);
}

/**
 * Builds the shape the UI consumes. `rationale` is left empty —
 * explainMatch() fills it in, and must never touch `score`.
 */
export function toResidentMatch(
  a: ResidentProfile,
  b: ResidentProfile,
  result: MatchResult,
): ResidentMatch {
  return {
    id: `${a.residentId}-${b.residentId}`,
    residentAId: a.residentId,
    residentBId: b.residentId,
    score: result.score,
    components: result.components,
    rationale: "",
    status: "suggested",
  };
}
