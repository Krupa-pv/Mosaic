import type { SocialEvent } from "@shared/types";
import { events } from "@shared/seed";

// ============================================================
// WEEKLY SCHEDULES — demo pair only.
//
// Not a calendar integration (§2 rules that out). This is just what
// each resident is already signed up for, so accepting a
// recommendation visibly lands somewhere.
//
// The asymmetry is the pitch: Margaret is down to one activity a week
// (§3 — "0-1 events/week"), Helen is on the floor's social circuit.
// And Helen already attends Garden Circle, so the intervention is
// Margaret joining Helen's routine, not a new event for both.
// ============================================================

const baseSchedule: Record<string, string[]> = {
  margaret: ["jazz-hour"],
  helen: [
    "garden-circle",
    "shared-breakfast",
    "morning-walk",
    "trivia",
    "book-club",
  ],
};

// What Margaret has stopped attending. §3: she was at 3 events/week and
// is now at 0-1. Drawing these as lapsed rather than leaving the days
// blank is the difference between "nothing scheduled" and "she withdrew"
// — and both entries are backed by text elsewhere in the demo:
//   cooking-demo    <- care plan, "previously participated in cooking groups"
//   shared-breakfast <- risk factor, "meals in shared dining down 41%"
const lapsedSchedule: Record<string, string[]> = {
  margaret: ["cooking-demo", "shared-breakfast"],
};

const DAY_ORDER = [
  "daily",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function dayRank(startTime: string): number {
  const day = startTime.split(" ")[0]?.toLowerCase() ?? "";
  const i = DAY_ORDER.indexOf(day);
  return i === -1 ? DAY_ORDER.length : i;
}

export interface ScheduleEntry {
  event: SocialEvent;
  /** True when this is the activity just prescribed. */
  isNew: boolean;
  /** True when they were already attending before the prescription. */
  wasAlready: boolean;
  /** True when they used to attend and have stopped. */
  lapsed: boolean;
}

/**
 * A resident's week, optionally with a newly accepted event folded in.
 * If they already attend it, it's flagged rather than duplicated.
 */
export function weekFor(residentId: string, addedEventId?: string): ScheduleEntry[] {
  const existing = baseSchedule[residentId] ?? [];
  const already = addedEventId ? existing.includes(addedEventId) : false;

  const active = already || !addedEventId ? existing : [...existing, addedEventId];
  // A prescribed activity is no longer lapsed — it's the thing being restarted.
  const lapsed = (lapsedSchedule[residentId] ?? []).filter(
    (id) => id !== addedEventId
  );

  const build = (ids: string[], isLapsed: boolean) =>
    ids
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is SocialEvent => Boolean(e))
      .map((event) => ({
        event,
        isNew: !isLapsed && event.id === addedEventId && !already,
        wasAlready: !isLapsed && event.id === addedEventId && already,
        lapsed: isLapsed,
      }));

  return [...build(active, false), ...build(lapsed, true)].sort(
    (a, b) => dayRank(a.event.startTime) - dayRank(b.event.startTime)
  );
}

export function weeklyCount(residentId: string): number {
  return (baseSchedule[residentId] ?? []).length;
}

export function lapsedCount(residentId: string): number {
  return (lapsedSchedule[residentId] ?? []).length;
}
