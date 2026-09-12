// Turns the deterministic score components into plain language.
//
// The model is given the numbers and told to explain them. It never
// produces or adjusts a score — that is scoreMatch()'s job alone.
// This split is the honest answer to "isn't this just an LLM guessing".

import type { MatchComponents, ResidentProfile, SocialEvent } from "../../types";
import { generateText } from "./client";

const SYSTEM = `You write one short paragraph explaining why two nursing home
residents were matched, for a staff member with about ten seconds to read it.

Rules:
- The compatibility score was computed by a deterministic algorithm. Explain it.
  Never state a different score, and never suggest the pairing is uncertain.
- Ground every claim in the profile facts you are given. Invent nothing.
- Name the two or three strongest reasons. Ignore weak components.
- Two to three sentences. Warm but factual. No bullet points, no headings.
- Use the residents' first names.`;

function describe(profile: ResidentProfile, name: string): string {
  const care = profile.careNeeds;
  return [
    `${name}:`,
    `interests ${profile.interests.join(", ") || "none recorded"}`,
    `prefers ${profile.socialPreferences.preferredGroupSize ?? "unspecified"} groups`,
    `most active in the ${profile.preferredTimeOfDay ?? "unspecified"}`,
    `mobility ${care.mobility ?? "unspecified"}`,
    `conversational style ${profile.personality.conversationalStyle ?? "unspecified"}`,
    profile.personalityNote ? `note: ${profile.personalityNote}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function explainMatch(
  a: ResidentProfile,
  b: ResidentProfile,
  score: number,
  components: MatchComponents,
  names: { a: string; b: string },
  fallback?: string,
): Promise<string> {
  const user = `${describe(a, names.a)}
${describe(b, names.b)}

Compatibility score: ${score} out of 100.
Component scores (0-100): ${Object.entries(components)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ")}

Explain this match to a staff member.`;

  return generateText(SYSTEM, user, fallback);
}

const EVENT_SYSTEM = `You write one sentence explaining why a specific activity
suits two nursing home residents who have been matched.

Rules:
- Ground it in the activity's accessibility, group size, timing, and the
  interest it shares with the residents. Invent nothing.
- One sentence. Concrete, not promotional.`;

export async function explainEventFit(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
  names: { a: string; b: string },
  fallback?: string,
): Promise<string> {
  const user = `${describe(a, names.a)}
${describe(b, names.b)}

Activity: ${event.title}, ${event.startTime}, ${event.location}.
Tagged interests: ${event.interests.join(", ")}. Group size: ${event.groupSize}.
Seated option: ${event.accessibility.seatedAvailable}. Physical intensity: ${event.accessibility.physicalIntensity}.

Why does this activity suit them?`;

  return generateText(EVENT_SYSTEM, user, fallback);
}
