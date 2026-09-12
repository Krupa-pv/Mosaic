// ============================================================
// Event fit: does this activity work for a matched PAIR of residents?
//
// Same architecture as resident matching — hard filters reject, then
// weighted components score. No LLM. explainEventFit() writes the prose
// afterwards from these numbers.
// ============================================================

import type { ResidentProfile, SocialEvent } from "../../types";
import { countShared, norm, saturate } from "./interests";

// The spec lists five terms for event fit — interest similarity,
// accessibility, time preference, group size, prior activity outcomes —
// but gives no percentages, unlike the resident formula. These splits are
// mine. Prior outcomes needs the feedback loop, so it is omitted.
export const EVENT_WEIGHTS = {
  interests: 0.4,
  accessibility: 0.25,
  schedule: 0.2,
  groupSize: 0.15,
} as const;

export interface EventFitComponents {
  interests: number;
  accessibility: number;
  schedule: number;
  groupSize: number;
}

export interface EventFit {
  event: SocialEvent;
  eligible: boolean;
  score: number;
  components: EventFitComponents;
  disqualifiers: string[];
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

// ---- Time parsing --------------------------------------------
// startTime is a display string in this build ("Wednesday 10:00 AM",
// "Daily 8:30 AM"), not a Date, so read the period off the text.

export function parseTimeOfDay(startTime: string): "morning" | "afternoon" | "evening" | undefined {
  const match = startTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return undefined;

  let hour = Number(match[1]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// ---- Hard filters --------------------------------------------
// An activity has to work for BOTH residents. One person who cannot
// take part is enough to reject it.

const needsSeating = (p: ResidentProfile) =>
  p.careNeeds.mobility === "walker" ||
  p.careNeeds.mobility === "wheelchair" ||
  p.careNeeds.fallRisk === "high";

const limitedMobility = (p: ResidentProfile) =>
  p.careNeeds.mobility === "walker" || p.careNeeds.mobility === "wheelchair";

export function eventHardFilters(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
): string[] {
  const reasons: string[] = [];
  const pair: [ResidentProfile, ResidentProfile] = [a, b];

  for (const p of pair) {
    if (p.careNeeds.mobility === "wheelchair" && !event.accessibility.wheelchairAccessible) {
      reasons.push(`${event.title} is not wheelchair accessible`);
      break;
    }
  }

  if (!event.accessibility.seatedAvailable && pair.some(needsSeating)) {
    reasons.push(`${event.title} has no seated option, and one resident cannot stand throughout`);
  }

  if (
    event.accessibility.physicalIntensity === "high" ||
    (event.accessibility.physicalIntensity === "moderate" &&
      pair.some((p) => limitedMobility(p) || p.careNeeds.fallRisk === "high"))
  ) {
    reasons.push(`${event.title} is too physically demanding for this pair`);
  }

  // types.ts has no highNoise flag, so noise sensitivity can only be read
  // from the free-text constraints the care plan produced.
  const noiseSensitive = pair.some((p) =>
    p.activityConstraints.some((c) => /noise|loud/i.test(c)),
  );
  if (noiseSensitive && event.groupSize === "large") {
    reasons.push(`${event.title} is a large gathering, and one resident avoids high-noise settings`);
  }

  return reasons;
}

// ---- Components ----------------------------------------------

/** Interests the pair share and the event covers are the strongest signal;
 *  an interest only one resident holds still counts, but for less. */
export function scoreEventInterests(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
): number {
  const aTags = a.interests.map(norm);
  const bTags = b.interests.map(norm);

  const shared = aTags.filter((tag) => bTags.includes(tag));
  const individual = [...aTags, ...bTags].filter((tag) => !shared.includes(tag));

  const sharedHits = countShared(shared, event.interests);
  const individualHits = countShared(individual, event.interests);

  return clamp(saturate(1.4 * sharedHits + 0.5 * individualHits, 1, 12));
}

export function scoreEventAccessibility(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
): number {
  let penalty = 0;
  const pair = [a, b];

  if (pair.some(needsSeating) && !event.accessibility.seatedAvailable) penalty += 40;
  if (pair.some(limitedMobility) && event.accessibility.physicalIntensity === "moderate") {
    penalty += 25;
  }
  if (pair.some((p) => p.careNeeds.mobility === "wheelchair") && !event.accessibility.wheelchairAccessible) {
    penalty += 50;
  }
  // A large room is harder for a resident with reduced hearing.
  if (
    pair.some((p) => p.careNeeds.hearing === "moderate" || p.careNeeds.hearing === "severe") &&
    event.groupSize === "large"
  ) {
    penalty += 15;
  }

  return clamp(100 - penalty);
}

export function scoreEventSchedule(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
): number {
  const when = parseTimeOfDay(event.startTime);
  if (!when) return 70;

  const order = ["morning", "afternoon", "evening"] as const;
  const scoreOne = (p: ResidentProfile) => {
    if (!p.preferredTimeOfDay) return 70;
    const gap = Math.abs(order.indexOf(p.preferredTimeOfDay) - order.indexOf(when));
    return gap === 0 ? 100 : gap === 1 ? 50 : 10;
  };

  return clamp((scoreOne(a) + scoreOne(b)) / 2);
}

export function scoreEventGroupSize(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
): number {
  const order = ["one_on_one", "small", "large"] as const;
  const scoreOne = (p: ResidentProfile) => {
    const pref = p.socialPreferences.preferredGroupSize;
    if (!pref) return 70;
    const gap = Math.abs(order.indexOf(pref) - order.indexOf(event.groupSize));
    return gap === 0 ? 100 : gap === 1 ? 55 : 20;
  };

  return clamp((scoreOne(a) + scoreOne(b)) / 2);
}

// ---- Top level -----------------------------------------------

export function scoreEventFit(
  a: ResidentProfile,
  b: ResidentProfile,
  event: SocialEvent,
): EventFit {
  const components: EventFitComponents = {
    interests: Math.round(scoreEventInterests(a, b, event)),
    accessibility: Math.round(scoreEventAccessibility(a, b, event)),
    schedule: Math.round(scoreEventSchedule(a, b, event)),
    groupSize: Math.round(scoreEventGroupSize(a, b, event)),
  };

  const disqualifiers = eventHardFilters(a, b, event);
  if (disqualifiers.length > 0) {
    return { event, eligible: false, score: 0, components, disqualifiers };
  }

  const score = (Object.keys(EVENT_WEIGHTS) as (keyof EventFitComponents)[]).reduce(
    (sum, key) => sum + components[key] * EVENT_WEIGHTS[key],
    0,
  );

  return { event, eligible: true, score: Math.round(clamp(score)), components, disqualifiers: [] };
}

/** Eligible events only, best first. */
export function recommendEvent(
  a: ResidentProfile,
  b: ResidentProfile,
  events: SocialEvent[],
): EventFit[] {
  return events
    .map((event) => scoreEventFit(a, b, event))
    .filter((fit) => fit.eligible)
    .sort((x, y) => y.score - x.score);
}

/** Everything that was rejected, with the reason. Useful in the UI to show
 *  the filter working rather than silently dropping options. */
export function rejectedEvents(
  a: ResidentProfile,
  b: ResidentProfile,
  events: SocialEvent[],
): EventFit[] {
  return events.map((event) => scoreEventFit(a, b, event)).filter((fit) => !fit.eligible);
}
