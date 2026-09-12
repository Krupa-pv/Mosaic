// Short, deterministic one-liners for the candidate list.
//
// Generated from the score components rather than by the model: there is
// one of these per candidate, and a per-candidate LLM call would make the
// ranking screen slow for no gain. The winner still gets a real LLM
// rationale via explainMatch().

import type { MatchComponents, ResidentProfile } from "../../types";
import { countShared, norm } from "./interests";

export function describeCandidate(
  a: ResidentProfile,
  b: ResidentProfile,
  components: MatchComponents,
): string {
  const aTags = a.interests.map(norm);
  const shared = b.interests.map(norm).filter((tag) => aTags.includes(tag));

  const parts: string[] = [];

  if (shared.length > 0) {
    parts.push(`Shares ${shared.slice(0, 2).join(" and ")}`);
  } else if (countShared(a.interests, b.interests) > 0) {
    parts.push("Related but not overlapping interests");
  } else {
    parts.push("No overlapping interests");
  }

  if (components.socialPreferences === 100 && components.schedule === 100) {
    parts.push("same group size and time of day");
  } else if (components.socialPreferences === 100) {
    parts.push("same group-size preference");
  } else if (components.schedule === 100) {
    parts.push("same time of day");
  } else if (components.schedule < 60) {
    parts.push("active at different times");
  }

  if (components.complementaryTraits >= 85) {
    parts.push("complementary conversational styles");
  } else if (components.complementaryTraits <= 40) {
    parts.push("both reserved, so conversation may stall");
  }

  if (components.careCompatibility < 85) parts.push("differing mobility needs");

  return `${parts.join(", ")}.`;
}
