// Builds a week of social prescriptions for the whole floor.
//
// Free of Next.js and of Dev B's path aliases, like the rest of lib/, so
// everything it needs about the roster (risk, existing attendance) is
// passed in by the route.
//
// Deterministic and LLM-free. It reuses rankCandidates and
// recommendEvent rather than scoring anything itself — one scorer.

import type { SocialEvent } from "../types";
import { rankCandidates } from "./candidates";
import { recommendEvent } from "./matching/recommend-event";
import { allProfiles } from "./profiles";

export interface Priority {
  residentId: string;
  /** Isolation risk, and how fast it is moving. */
  score: number;
  trend: number;
  /** Their shared-dining attendance is falling. Mealtimes are the most
   *  frequent contact on a floor, so for these residents a seat at a
   *  table is tried before any weekly activity. */
  mealsFalling?: boolean;
}

export interface PlanOptions {
  priorities: Priority[];
  events: SocialEvent[];
  highRiskIds?: Set<string>;
  /** Who already attends what, so the plan doesn't double-book. */
  existing?: Record<string, string[]>;
  /** Cap on how often one resident is asked to host. */
  maxPerCompanion?: number;
}

export interface PlannedPairing {
  eventId: string;
  eventTitle: string;
  startTime: string;
  subjectId: string;
  companionId: string;
  /** Anyone else added to the same session — groups, not just pairs. */
  alsoThere: string[];
  score: number;
  reason: string;
}

export interface WeekPlan {
  pairings: PlannedPairing[];
  /** Watched residents the plan could not place, with why. */
  unplaced: { residentId: string; reason: string }[];
}

/** Seats an activity should hold, by its group size. */
function capacityOf(event: SocialEvent): number {
  switch (event.groupSize) {
    case "one_on_one":
      return 2;
    case "small":
      return 5;
    default:
      return 10;
  }
}

/**
 * Rising risk outranks high-but-flat risk: someone climbing fast is
 * losing ground now, which is the moment an intervention is cheapest.
 */
export function priorityOf(p: Priority): number {
  return p.score + p.trend * 2;
}

export function planWeek({
  priorities,
  events,
  highRiskIds,
  existing = {},
  maxPerCompanion = 2,
}: PlanOptions): WeekPlan {
  const queue = [...priorities].sort((a, b) => priorityOf(b) - priorityOf(a));
  // Shared meals, identified by their own group tag rather than by title.
  const meals = events.filter((e) => e.startTime.startsWith("Daily"));

  const pairings: PlannedPairing[] = [];
  const unplaced: WeekPlan["unplaced"] = [];
  const companionLoad = new Map<string, number>();
  // eventId -> residents already on it, seeded with current attendance.
  const roster = new Map<string, Set<string>>(
    Object.entries(existing).map(([k, v]) => [k, new Set(v)])
  );

  for (const p of queue) {
    const subject = allProfiles[p.residentId];
    if (!subject) {
      unplaced.push({
        residentId: p.residentId,
        reason: "No profile on file — nothing to match against yet",
      });
      continue;
    }
    if (subject.interests.length === 0) {
      unplaced.push({
        residentId: p.residentId,
        reason: "Profile has no interests yet — read a care plan first",
      });
      continue;
    }

    const candidates = rankCandidates(p.residentId, subject, { highRiskIds })
      .filter((c) => !c.filtered)
      // Spread the load: nobody should be asked to host the whole floor.
      .filter(
        (c) =>
          (companionLoad.get(c.profile.residentId) ?? 0) < maxPerCompanion
      );

    if (candidates.length === 0) {
      unplaced.push({
        residentId: p.residentId,
        reason: "No eligible companion left this week",
      });
      continue;
    }

    let placed = false;

    for (const candidate of candidates.slice(0, 4)) {
      const companionId = candidate.profile.residentId;

      const eligible = (pool: SocialEvent[]) =>
        recommendEvent(subject, candidate.profile, pool).filter((fit) => {
          const on = roster.get(fit.event.id);
          // Already together there — no prescription needed.
          return !(on?.has(p.residentId) && on?.has(companionId));
        });

      // Try a shared meal first when that's what they've withdrawn from.
      // Three meals a day beats a weekly activity for repeated contact.
      const fits = p.mealsFalling
        ? (() => {
            const atTable = eligible(meals);
            return atTable.length > 0 ? atTable : eligible(events);
          })()
        : eligible(events);

      if (fits.length === 0) continue;

      const best = fits[0];
      const on = roster.get(best.event.id) ?? new Set<string>();

      // Fill the rest of the table. A small group is more natural than a
      // pair sitting alone, and it costs no extra staff time — so add
      // anyone else who scores well against the subject and fits.
      const alsoThere: string[] = [];
      const seats = capacityOf(best.event) - (on.size + 2);
      if (seats > 0) {
        for (const extra of candidates) {
          if (alsoThere.length >= seats) break;
          const id = extra.profile.residentId;
          if (id === companionId || on.has(id)) continue;
          if ((companionLoad.get(id) ?? 0) >= maxPerCompanion) continue;
          // Everyone at the table has to work with the subject.
          const fit = recommendEvent(subject, extra.profile, [best.event]);
          if (fit.length === 0) continue;
          alsoThere.push(id);
        }
      }

      pairings.push({
        eventId: best.event.id,
        eventTitle: best.event.title,
        startTime: best.event.startTime,
        subjectId: p.residentId,
        companionId,
        alsoThere,
        score: candidate.score,
        reason: candidate.note,
      });

      on.add(p.residentId);
      on.add(companionId);
      for (const id of alsoThere) {
        on.add(id);
        companionLoad.set(id, (companionLoad.get(id) ?? 0) + 1);
      }
      roster.set(best.event.id, on);
      companionLoad.set(
        companionId,
        (companionLoad.get(companionId) ?? 0) + 1
      );

      placed = true;
      break;
    }

    if (!placed) {
      unplaced.push({
        residentId: p.residentId,
        reason: "No activity this week suits them and an available companion",
      });
    }
  }

  return { pairings, unplaced };
}
