import { events } from "@shared/seed";
import { allProfiles } from "../../lib/profiles";

// ============================================================
// Interests the floor shares that nothing on the calendar covers.
//
// The planner can only place people on activities that exist. This says
// what to add — "four residents list cooking and nothing covers it" —
// which is the other half of running a floor.
// ============================================================

export interface InterestGap {
  interest: string;
  count: number;
  suggestion: string;
}

const IDEAS: Record<string, string> = {
  gardening: "Add a second Garden Circle later in the week",
  cooking: "Add a baking afternoon",
  music: "Add a singalong or record hour",
  jazz: "Add a second music session",
  reading: "Add a large-print reading hour",
  art: "Add an open art table",
  games: "Add a cards and dominoes table",
  exercise: "Add a gentle chair-exercise class",
  socializing: "Add an afternoon tea",
  nature: "Add a courtyard morning",
  discussion: "Add a current-affairs discussion",
};

export function findInterestGaps(minShared = 2): InterestGap[] {
  const covered = new Set(
    events.flatMap((e) => e.interests.map((i) => i.toLowerCase()))
  );

  const counts = new Map<string, number>();
  for (const profile of Object.values(allProfiles)) {
    for (const raw of profile.interests) {
      const i = raw.toLowerCase();
      if (covered.has(i)) continue;
      counts.set(i, (counts.get(i) ?? 0) + 1);
    }
  }

  return [...counts]
    .filter(([, n]) => n >= minShared)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([interest, count]) => ({
      interest,
      count,
      suggestion: IDEAS[interest] ?? `Add something built around ${interest}`,
    }));
}
