import type {
  ExtractionResponse,
  MatchComponents,
  ResidentMatch,
  ResidentProfile,
  SocialPrescription,
} from "@shared/types";
import { readCarePlan, readIntake } from "./localExtract";
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
  /** Present from the live route; absent in older fallbacks. */
  components?: MatchComponents;
  interests?: string[];
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
  return { data: carePlanFallback(residentId, rawText), source: "fallback" };
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
  return { data: intakeFallback(residentId, rawText), source: "fallback" };
}

/** The profile already on file, if this resident has been profiled. */
export async function fetchProfile(
  residentId: string
): Promise<ResidentProfile | null> {
  try {
    const res = await fetch(`/api/profile/${residentId}`);
    if (!res.ok) return null;
    return (await res.json()) as ResidentProfile;
  } catch {
    return profilesById[residentId] ?? null;
  }
}

// ---- Matching ----

export async function findBestMatch(
  residentId: string,
  profile: ResidentProfile,
  /** Staff override — pair with this resident instead of the top-scored one. */
  companionId?: string
): Promise<Sourced<ResidentMatch>> {
  const live = await post<ResidentMatch>("/api/match", {
    residentId,
    profile,
    companionId,
  });
  if (live) return { data: live, source: "live" };
  return { data: matchFallback(residentId, companionId), source: "fallback" };
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
  match: ResidentMatch,
  /** The live, staff-edited profile. Without it the server scores event
   *  fit against its hardcoded seed copy and silently ignores every edit
   *  made in the UI. */
  profileA?: ResidentProfile
): Promise<Sourced<SocialPrescription>> {
  const live = await post<SocialPrescription>("/api/recommend", {
    match,
    profileA,
  });
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

// Read the document. The previous version returned a hardcoded profile,
// which was right for the two seeded residents and silently handed back
// Margaret's care needs for anybody else — so uploading a care plan for
// a new resident produced someone else's clinical data.
//
// The seeded copy is still preferred for the demo pair, because it was
// hand-verified; anything else is parsed from what was actually given.
function carePlanFallback(residentId: string, rawText = ""): ExtractionResponse {
  const parsed = readCarePlan(residentId, rawText);
  const seeded = profilesById[residentId];
  if (!seeded) return parsed;
  return {
    residentId,
    careNeeds: seeded.careNeeds,
    activityConstraints: seeded.activityConstraints,
    preferredTimeOfDay: seeded.preferredTimeOfDay,
    interests: carePlanInterests[residentId] ?? parsed.interests,
  };
}

function intakeFallback(residentId: string, rawText = ""): ExtractionResponse {
  const parsed = readIntake(residentId, rawText);
  const seeded = profilesById[residentId];
  if (!seeded) return parsed;
  return {
    residentId,
    interests: seeded.interests,
    personality: seeded.personality,
    socialPreferences: seeded.socialPreferences,
    personalityNote: seeded.personalityNote,
  };
}

function matchFallback(residentId: string, companionId = "helen"): ResidentMatch {
  return {
    id: `${residentId}-${companionId}`,
    residentAId: residentId,
    residentBId: companionId,
    // Regenerated from the real scorer so a fallback render is
    // indistinguishable from a live one. Do not hand-edit — run
    // `npm run verify:matching` and copy what it prints.
    score: 92,
    components: {
      interests: 78,
      socialPreferences: 100,
      careCompatibility: 100,
      schedule: 100,
      personality: 85,
      complementaryTraits: 100,
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
      score: 92,
      note: "Shares gardening, same group size and time of day, complementary conversational styles.",
      components: {
        interests: 78,
        socialPreferences: 100,
        careCompatibility: 100,
        schedule: 100,
        personality: 85,
        complementaryTraits: 100,
      },
      interests: ["gardening", "community events", "socializing"],
    },
    {
      residentId: "frances",
      score: 71,
      note: "No overlapping interests, same group size and time of day, complementary conversational styles.",
      components: {
        interests: 12,
        socialPreferences: 100,
        careCompatibility: 90,
        schedule: 100,
        personality: 70,
        complementaryTraits: 100,
      },
      interests: ["reading", "discussion"],
    },
    {
      residentId: "yolanda",
      score: 65,
      note: "No overlapping interests, same group-size preference, complementary conversational styles.",
      components: {
        interests: 12,
        socialPreferences: 100,
        careCompatibility: 80,
        schedule: 70,
        personality: 62,
        complementaryTraits: 100,
      },
      interests: ["reading", "games", "socializing"],
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
