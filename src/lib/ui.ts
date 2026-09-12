import type { ExtractionResponse, Resident, ResidentProfile } from "@shared/types";

export function riskTone(level: Resident["riskLevel"]) {
  switch (level) {
    case "high":
      return {
        badge: "bg-rose-50 text-rose-700 ring-rose-200",
        bar: "bg-rose-500",
        dot: "bg-rose-500",
        label: "High risk",
      };
    case "moderate":
      return {
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
        bar: "bg-amber-500",
        dot: "bg-amber-500",
        label: "Moderate risk",
      };
    default:
      return {
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        bar: "bg-emerald-500",
        dot: "bg-emerald-500",
        label: "Low risk",
      };
  }
}

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
