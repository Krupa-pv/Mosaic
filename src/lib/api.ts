import type {
  ExtractionResponse,
  ResidentMatch,
  ResidentProfile,
  SocialPrescription,
} from "@shared/types";
import {
  events,
  helenProfile,
  margaretHelenEventReason,
  margaretHelenRationale,
  margaretProfile,
} from "@shared/seed";

// ============================================================
// API CLIENT — the seam between Dev B (UI) and Dev A (AI functions).
//
// Every call hits Dev A's real endpoint first. If the route doesn't
// exist yet (or the LLM call is slow/flaky mid-recording), we fall
// back to the pre-verified seed response so the demo never dies.
//
// `source` tells the UI which one it got, so we can show a "cached
// fallback" hint in dev without ever blocking the flow.
// ============================================================

export type Sourced<T> = { data: T; source: "live" | "fallback" };

/**
 * One scored candidate from the matching pass. Deliberately NOT added to
 * Dev A's locked types.ts — this is a UI-side view of the ranking, and
 * the contract for it lives in the README.
 */
export interface MatchCandidate {
  residentId: string;
  score: number;
  note: string;
  /** True when a hard filter knocked them out before weighted scoring. */
  filtered?: boolean;
}

const TIMEOUT_MS = 12_000;

async function post<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---- Extraction ----

export async function extractCarePlan(
  residentId: string,
  rawText: string
): Promise<Sourced<ExtractionResponse>> {
  const live = await post<ExtractionResponse>("/api/extract/care-plan", {
    residentId,
    rawText,
  });
  if (live) return { data: live, source: "live" };
  return { data: carePlanFallback(residentId), source: "fallback" };
}

export async function extractIntake(
  residentId: string,
  rawText: string
): Promise<Sourced<ExtractionResponse>> {
  const live = await post<ExtractionResponse>("/api/extract/intake", {
    residentId,
    rawText,
  });
  if (live) return { data: live, source: "live" };
  return { data: intakeFallback(residentId), source: "fallback" };
}

// ---- Matching ----

export async function findBestMatch(
  residentId: string,
  profile: ResidentProfile
): Promise<Sourced<ResidentMatch>> {
  const live = await post<ResidentMatch>("/api/match", { residentId, profile });
  if (live) return { data: live, source: "live" };
  return { data: matchFallback(residentId), source: "fallback" };
}

export async function findCandidates(
  residentId: string,
  profile: ResidentProfile
): Promise<Sourced<MatchCandidate[]>> {
  const live = await post<MatchCandidate[]>("/api/match/candidates", {
    residentId,
    profile,
  });
  if (live?.length) return { data: live, source: "live" };
  return { data: candidatesFallback(), source: "fallback" };
}

// ---- Event recommendation ----

export async function recommendEvent(
  match: ResidentMatch
): Promise<Sourced<SocialPrescription>> {
  const live = await post<SocialPrescription>("/api/recommend", { match });
  if (live) return { data: live, source: "live" };
  return { data: prescriptionFallback(match), source: "fallback" };
}

// ---- Whop access gate ----

export async function checkAccess(): Promise<{ active: boolean; wired: boolean }> {
  try {
    const res = await fetch("/api/access");
    if (!res.ok) return { active: true, wired: false };
    const json = (await res.json()) as { active?: boolean };
    return { active: Boolean(json.active), wired: true };
  } catch {
    // Gate isn't built yet — never block the demo on it.
    return { active: true, wired: false };
  }
}

// ============================================================
// Fallbacks — pre-verified values from the seed dataset.
// ============================================================

const profilesById: Record<string, ResidentProfile> = {
  margaret: margaretProfile,
  helen: helenProfile,
};

// Only the interests the care-plan note itself mentions — the intake note
// is where the rest come from. Keeping these honest matters: the extracted
// JSON sits on screen next to its source text during the demo.
const carePlanInterests: Record<string, string[]> = {
  margaret: ["gardening", "cooking"],
  helen: [],
};

function carePlanFallback(residentId: string): ExtractionResponse {
  const p = profilesById[residentId] ?? margaretProfile;
  return {
    residentId,
    careNeeds: p.careNeeds,
    activityConstraints: p.activityConstraints,
    preferredTimeOfDay: p.preferredTimeOfDay,
    interests: carePlanInterests[residentId] ?? [],
  };
}

function intakeFallback(residentId: string): ExtractionResponse {
  const p = profilesById[residentId] ?? margaretProfile;
  return {
    residentId,
    interests: p.interests,
    personality: p.personality,
    socialPreferences: p.socialPreferences,
    personalityNote: p.personalityNote,
  };
}

function matchFallback(residentId: string): ResidentMatch {
  return {
    id: `${residentId}-helen`,
    residentAId: residentId,
    residentBId: "helen",
    score: 91,
    components: {
      interests: 88,
      socialPreferences: 100,
      careCompatibility: 95,
      schedule: 100,
      personality: 72,
      complementaryTraits: 94,
    },
    rationale: margaretHelenRationale,
    status: "suggested",
  };
}

// The runners-up. Each note says why they scored where they did — the
// point of showing this is that the pairing was chosen out of a field,
// not produced from nowhere.
function candidatesFallback(): MatchCandidate[] {
  return [
    {
      residentId: "helen",
      score: 91,
      note: "Shared gardening interest, same small-group preference, both mornings.",
    },
    {
      residentId: "frances",
      score: 74,
      note: "Compatible pace and group size, but no overlapping interests.",
    },
    {
      residentId: "yolanda",
      score: 66,
      note: "Socially active and welcoming — her week centres on reading, not gardening.",
    },
    {
      residentId: "dorothy",
      score: 0,
      note: "Filtered out: also at elevated isolation risk. Mosaic won't pair two withdrawing residents.",
      filtered: true,
    },
  ];
}

function prescriptionFallback(match: ResidentMatch): SocialPrescription {
  const event = events.find((e) => e.id === "garden-circle") ?? events[0];
  return {
    id: `${match.id}-${event.id}`,
    match,
    event,
    eventFitReason: margaretHelenEventReason,
    status: "suggested",
  };
}
