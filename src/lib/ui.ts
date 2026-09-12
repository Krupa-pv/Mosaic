import type { ExtractionResponse, Resident, ResidentProfile } from "@shared/types";

export function riskTone(level: Resident["riskLevel"]) {
  switch (level) {
    case "high":
      return {
        badge: "bg-high-soft text-high",
        bar: "bg-high",
        dot: "bg-high",
        text: "text-high",
        label: "Elevated",
      };
    case "moderate":
      return {
        badge: "bg-mid-soft text-mid",
        bar: "bg-mid",
        dot: "bg-mid",
        text: "text-mid",
        label: "Watch",
      };
    default:
      return {
        badge: "bg-low-soft text-low",
        bar: "bg-low",
        dot: "bg-low",
        text: "text-low",
        label: "Stable",
      };
  }
}

// SVG strokes can't read Tailwind classes — chart marks need the raw hex.
// Kept in step with the --color-high/mid/low tokens in globals.css.
export function riskHex(level: Resident["riskLevel"]) {
  return level === "high" ? "#c23b1c" : level === "moderate" ? "#c4820a" : "#3f8a5c";
}

/** Raw token hexes for SVG strokes/fills, kept in step with globals.css. */
export const HEX = {
  accent: "#0f6b4f",
  accentBright: "#16a06f",
  accentDeep: "#07422f",
  line: "#ded5c6",
  lineSoft: "#eae3d7",
  faint: "#9d9689",
  high: "#c23b1c",
  raised: "#ffffff",
} as const;

export function trendLabel(trend: number) {
  if (trend > 0) return `▲ ${trend} in 3 weeks`;
  if (trend < 0) return `▼ ${Math.abs(trend)} in 3 weeks`;
  return "No change";
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function titleCase(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Care plan wins on conflict — mirrors Dev A's server-side merge rule.
export function mergeProfile(
  residentId: string,
  carePlan: ExtractionResponse | null,
  intake: ExtractionResponse | null
): ResidentProfile {
  const interests = Array.from(
    new Set([...(intake?.interests ?? []), ...(carePlan?.interests ?? [])])
  );

  return {
    residentId,
    careNeeds: { ...(intake?.careNeeds ?? {}), ...(carePlan?.careNeeds ?? {}) },
    activityConstraints: carePlan?.activityConstraints ??
      intake?.activityConstraints ?? [],
    preferredTimeOfDay: carePlan?.preferredTimeOfDay ?? intake?.preferredTimeOfDay,
    interests,
    personality: {
      introversion: 0.5,
      ...(carePlan?.personality ?? {}),
      ...(intake?.personality ?? {}),
    },
    socialPreferences: {
      ...(intake?.socialPreferences ?? {}),
      ...(carePlan?.socialPreferences ?? {}),
    },
    personalityNote: intake?.personalityNote ?? carePlan?.personalityNote,
  };
}
