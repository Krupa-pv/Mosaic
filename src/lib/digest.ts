import type { Observation } from "./observations";

// ============================================================
// Condensing a run of daily notes into main points.
//
// Deterministic, so the history log is never blank waiting on a model.
// Counts themes, reads the sentiment trend, and names what recurs.
// ============================================================

export interface DigestPoint {
  text: string;
  tone: "good" | "watch" | "neutral";
  /** Notes supporting it. */
  support: number;
}

const THEMES: { match: RegExp; label: string }[] = [
  { match: /garden|plant|flower|tomato|dahlia/i, label: "gardening" },
  { match: /grandchild|daughter|son|family|anne|michael/i, label: "family" },
  { match: /bird|outside|courtyard|window/i, label: "being outdoors" },
  { match: /music|jazz|piano|organ|sing/i, label: "music" },
  { match: /cook|bake|kitchen|recipe/i, label: "cooking" },
  { match: /book|read|paper|story/i, label: "reading" },
  { match: /tired|fatigue|nap|slept/i, label: "tiredness" },
  { match: /pain|sore|ache|unwell|ill/i, label: "feeling unwell" },
  { match: /loud|noisy|crowd|too many|busy/i, label: "noise or crowds" },
  { match: /alone|room|declin|refus|didn't want/i, label: "staying in" },
];

export function digest(notes: Observation[]): DigestPoint[] {
  if (notes.length === 0) return [];

  const points: DigestPoint[] = [];
  const counts = new Map<string, number>();

  for (const n of notes) {
    for (const t of THEMES) {
      if (t.match.test(n.text)) {
        counts.set(t.label, (counts.get(t.label) ?? 0) + 1);
      }
    }
  }

  const negative = new Set(["tiredness", "feeling unwell", "noise or crowds", "staying in"]);

  for (const [label, support] of [...counts].sort((a, b) => b[1] - a[1])) {
    if (support < 2) continue;
    points.push({
      text: negative.has(label)
        ? `${label[0].toUpperCase()}${label.slice(1)} came up in ${support} notes.`
        : `Came back to ${label} across ${support} notes.`,
      tone: negative.has(label) ? "watch" : "good",
      support,
    });
  }

  // Sentiment, which is the thing a handover actually needs first.
  const well = notes.filter((n) => n.sentiment === "went_well").length;
  const missed = notes.filter((n) => n.sentiment === "didnt_happen").length;
  const follow = notes.filter((n) => n.sentiment === "follow_up").length;

  if (missed >= 2) {
    points.unshift({
      text: `${missed} sessions didn't happen — worth asking why before booking another group.`,
      tone: "watch",
      support: missed,
    });
  }
  if (follow >= 2) {
    points.unshift({
      text: `${follow} notes flagged for follow-up.`,
      tone: "watch",
      support: follow,
    });
  }
  if (well >= 2 && missed === 0) {
    points.unshift({
      text: `${well} of ${notes.length} recent sessions went well.`,
      tone: "good",
      support: well,
    });
  }

  return points.slice(0, 5);
}

/** Notes bucketed by calendar day, newest day first. */
export function byDay(notes: Observation[]): { day: string; at: number; notes: Observation[] }[] {
  const groups = new Map<string, Observation[]>();
  for (const n of notes) {
    const key = new Date(n.at).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups.entries()]
    .map(([day, list]) => ({
      day,
      at: list[0].at,
      notes: [...list].sort((a, b) => b.at - a.at),
    }))
    .sort((a, b) => b.at - a.at);
}
