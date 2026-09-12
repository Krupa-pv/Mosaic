import type { Resident, ResidentProfile } from "@shared/types";
import { events } from "@shared/seed";
import { lapsedFor, weeklyCount } from "./schedule";

// ============================================================
// What you can actually do for a withdrawing resident, ranked.
//
// Pairing is one option, not the answer to everything. Someone who has
// stopped coming to the dining room needs a seating change; someone
// whose family has gone quiet needs a phone call; someone who keeps
// declining groups needs ten minutes in their room, not a bigger group.
//
// Scoring is deterministic and resident-specific: a base for how much
// contact the intervention buys, then adjustments from this resident's
// risk factors, profile and recent notes. Every adjustment carries the
// sentence that justifies it, so the ranking can always be explained.
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
  effort: "2 min" | "10 min" | "20 min";
  score: number;
  /** Why it sits where it does — shown on the top-ranked option. */
  rationale: string;
  href?: string;
}

export interface InterventionContext {
  profile?: Partial<ResidentProfile>;
  /** Recent daily notes, used to demote what keeps not working. */
  notes?: { text: string; sentiment: string }[];
}

const has = (factors: string[], ...needles: string[]) =>
  factors.some((f) => needles.some((n) => f.toLowerCase().includes(n)));

const factor = (factors: string[], re: RegExp, fallback: string) =>
  factors.find((x) => re.test(x)) ?? fallback;

export function interventionsFor(
  resident: Resident,
  ctx: InterventionContext = {}
): Intervention[] {
  const f = resident.riskFactors;
  const interests = ctx.profile?.interests ?? [];
  const introversion = ctx.profile?.personality?.introversion ?? 0.5;
  const groupSize = ctx.profile?.socialPreferences?.preferredGroupSize;
  const notes = ctx.notes ?? [];

  const lapsed = lapsedFor(resident.id);
  const weekly = weeklyCount(resident.id);
  const missed = notes.filter((n) => n.sentiment === "didnt_happen").length;
  const urgent = resident.riskTrend >= 15;

  const out: Intervention[] = [];
  const push = (
    i: Omit<Intervention, "score" | "rationale">,
    base: number,
    adjustments: [number, string][]
  ) => {
    const applied = adjustments.filter(([n]) => n !== 0);
    out.push({
      ...i,
      score: Math.max(0, Math.min(100, base + applied.reduce((s, [n]) => s + n, 0))),
      rationale: applied.length
        ? applied.map(([, why]) => why).join(" ")
        : "Generally useful, with nothing specific pointing to it.",
    });
  };

  /* ---- dining: the highest-frequency contact there is ---- */
  if (has(f, "dining", "meals")) {
    push(
      {
        kind: "dining",
        title: "Change their dining table",
        because: factor(f, /dining|meals/i, "Eating alone more often"),
        detail:
          "Seat them with a resident they score well against. Three meals a day is more contact than any weekly activity.",
        effort: "2 min",
      },
      82,
      [
        [10, "Mealtimes are the most frequent contact on the floor, so a seating change buys the most repeated exposure for the least staff time."],
        [urgent ? 6 : 0, "Risk is climbing fast, which favours something that starts today rather than next week."],
        [missed >= 2 ? 5 : 0, `Group sessions have been declined ${missed} times, and a meal isn't an event they can turn down.`],
      ]
    );
  }

  /* ---- restart something they already know ---- */
  if (lapsed.length > 0) {
    const e = events.find((x) => x.id === lapsed[0]);
    if (e) {
      push(
        {
          kind: "restart",
          title: `Walk them back to ${e.title}`,
          because: `Stopped attending ${e.title}`,
          detail: `They used to go. Re-introducing a familiar activity asks less of them than a new one — ${e.startTime}, ${e.location}.`,
          effort: "10 min",
        },
        78,
        [
          [8, "They already know the room and the people, so this asks less of them than anything new."],
          [weekly <= 1 ? 6 : 0, "Their week is nearly empty, so any restored routine counts double."],
          [introversion > 0.6 ? 4 : 0, "Familiar ground suits someone who takes a while to warm up."],
        ]
      );
    }
  }

  /* ---- one-to-one, for someone pulling away ---- */
  if (has(f, "withdraw", "alone", "in-room", "in room")) {
    push(
      {
        kind: "one_to_one",
        title: "Sit with them one-to-one",
        because: factor(f, /withdraw|alone|room/i, "Spending more time alone"),
        detail:
          "Someone pulling away often won't accept a group first. Ten minutes in the room, no agenda.",
        effort: "20 min",
      },
      70,
      [
        [introversion > 0.6 ? 10 : 0, "They're reserved, so a one-to-one is likely to land where a group wouldn't."],
        [groupSize === "one_on_one" ? 8 : 0, "Their profile already says they prefer one-to-one."],
        [missed >= 2 ? 9 : 0, `${missed} group sessions didn't happen — the pattern says start smaller.`],
        [-6, "It costs twenty minutes of staff time, which is the most expensive option here."],
      ]
    );
  }

  /* ---- family ---- */
  if (has(f, "family")) {
    push(
      {
        kind: "family",
        title: "Call the family",
        because: factor(f, /family/i, "Family contact is flat"),
        detail:
          "Visits haven't dropped, but they haven't risen either. The family likely doesn't know anything has changed.",
        effort: "10 min",
      },
      66,
      [
        [urgent ? 8 : 0, "Risk has moved sharply enough that the family should hear it from you first."],
        [4, "Family contact is the one lever that keeps working when they're not leaving the room."],
      ]
    );
  }

  /* ---- a solo invitation ---- */
  if (weekly <= 1 && interests.length > 0) {
    const match = events.find((e) =>
      e.interests.some((i) => interests.includes(i))
    );
    if (match) {
      const shared = match.interests.find((i) => interests.includes(i));
      push(
        {
          kind: "solo_activity",
          title: `Invite them to ${match.title}`,
          because: `Only ${weekly} activity on their week`,
          detail: `Matches their interest in ${shared}. No pairing needed — just an invitation.`,
          effort: "2 min",
        },
        62,
        [
          [6, `It lines up with an interest already on their profile (${shared}).`],
          [missed >= 2 ? -10 : 0, "Recent invitations haven't been taken up, so this is unlikely to be the thing that works."],
        ]
      );
    }
  }

  /* ---- pairing ---- */
  push(
    {
      kind: "pair",
      title: "Pair with a companion",
      because: has(f, "event attendance", "declined", "group activities")
        ? factor(f, /attendance|declined|group/i, "Attendance is falling")
        : "Fewer shared activities than before",
      detail:
        "Mosaic scores every other resident and suggests an activity that suits them both.",
      effort: "10 min",
      href: `/residents/${resident.id}/pair`,
    },
    72,
    [
      [introversion < 0.5 ? 8 : 0, "They're outgoing, so a new face is likely to be welcome."],
      [introversion > 0.7 ? -8 : 0, "They're quite reserved, so a new person may be a bigger ask than it looks."],
      [missed >= 2 ? -12 : 0, `${missed} sessions didn't happen — adding another booking is unlikely to be what changes that.`],
      [weekly === 0 ? -4 : 0, "With nothing on their week, getting them to anything at all comes before who they go with."],
    ]
  );

  return out.sort((a, b) => b.score - a.score);
}
