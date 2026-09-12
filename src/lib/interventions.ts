import type { Resident } from "@shared/types";
import { events } from "@shared/seed";
import { lapsedFor, weeklyCount } from "./schedule";

// ============================================================
// What you can actually do for a withdrawing resident.
//
// Pairing is one option, not the answer to everything. A resident who
// has stopped coming to the dining room needs a seating change, not a
// companion; one whose family has gone quiet needs a phone call. Each
// option below is derived from a specific risk factor, so the reason is
// always visible next to the action.
//
// Deterministic — no model involved in deciding what to offer.
// ============================================================

export type InterventionKind =
  | "pair"
  | "restart"
  | "dining"
  | "family"
  | "one_to_one"
  | "solo_activity";

export interface Intervention {
  kind: InterventionKind;
  title: string;
  /** The risk factor this responds to. */
  because: string;
  detail: string;
  /** Rough staff time, so a busy shift can pick the cheap one. */
  effort: "2 min" | "10 min" | "20 min";
  /** Higher is more strongly indicated by this resident's data. */
  weight: number;
  /** Set when the action is a link rather than a task. */
  href?: string;
}

const has = (factors: string[], ...needles: string[]) =>
  factors.some((f) => needles.some((n) => f.toLowerCase().includes(n)));

export function interventionsFor(
  resident: Resident,
  interests: string[] = []
): Intervention[] {
  const f = resident.riskFactors;
  const out: Intervention[] = [];
  const lapsed = lapsedFor(resident.id);
  const weekly = weeklyCount(resident.id);

  // Always available — the social-matching core.
  out.push({
    kind: "pair",
    title: "Pair with a companion",
    because: has(f, "event attendance", "declined", "group activities")
      ? f.find((x) => /attendance|declined|group/i.test(x)) ?? "Attendance is falling"
      : "Fewer shared activities than before",
    detail:
      "Mosaic scores every other resident and suggests an activity that suits them both.",
    effort: "10 min",
    weight: 70,
    href: `/residents/${resident.id}/pair`,
  });

  // Something they used to do and stopped — the lowest-friction ask,
  // because it's a routine they already know.
  if (lapsed.length > 0) {
    const e = events.find((x) => x.id === lapsed[0]);
    if (e) {
      out.push({
        kind: "restart",
        title: `Walk them back to ${e.title}`,
        because: `Stopped attending ${e.title}`,
        detail: `They used to go. Re-introducing a familiar activity asks less of them than a new one — ${e.startTime}, ${e.location}.`,
        effort: "10 min",
        weight: 88,
      });
    }
  }

  // Mealtimes are the highest-frequency social contact in a care home,
  // so a seating change buys more contact than any single activity.
  if (has(f, "dining", "meals")) {
    out.push({
      kind: "dining",
      title: "Change their dining table",
      because: f.find((x) => /dining|meals/i.test(x)) ?? "Eating alone more often",
      detail:
        "Seat them with a resident they score well against. Three meals a day is more contact than any weekly activity.",
      effort: "2 min",
      weight: 92,
    });
  }

  // "Unchanged" family visits alongside rising risk is worth a nudge —
  // the family doesn't know anything has changed.
  if (has(f, "family")) {
    out.push({
      kind: "family",
      title: "Call the family",
      because: f.find((x) => /family/i.test(x)) ?? "Family contact is flat",
      detail:
        "Visits haven't dropped, but they haven't risen either. The family likely doesn't know anything has changed.",
      effort: "10 min",
      weight: 74,
    });
  }

  // When notes mention withdrawal, a group is the wrong first step.
  if (has(f, "withdraw", "alone", "in-room", "in room")) {
    out.push({
      kind: "one_to_one",
      title: "Sit with them one-to-one",
      because:
        f.find((x) => /withdraw|alone|room/i.test(x)) ?? "Spending more time alone",
      detail:
        "Someone pulling away often won't accept a group first. Ten minutes in the room, no agenda.",
      effort: "20 min",
      weight: 80,
    });
  }

  // Nearly empty week: just getting them to anything is the win.
  if (weekly <= 1 && interests.length > 0) {
    const match = events.find((e) =>
      e.interests.some((i) => interests.includes(i))
    );
    if (match) {
      out.push({
        kind: "solo_activity",
        title: `Invite them to ${match.title}`,
        because: `Only ${weekly} activity on their week`,
        detail: `Matches their interest in ${match.interests.find((i) => interests.includes(i))}. No pairing needed — just an invitation.`,
        effort: "2 min",
        weight: 66,
      });
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}
