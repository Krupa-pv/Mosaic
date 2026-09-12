import type { ExtractionResponse } from "@shared/types";

// ============================================================
// A deterministic reader for care plans and intake notes.
//
// This is the fallback when the extraction API is unreachable — which
// is the recording condition, and was previously handled by returning a
// hardcoded profile. That worked for the two seeded residents and
// silently returned Margaret's care needs for everybody else.
//
// It reads the actual document instead: crude, but it is genuinely
// derived from what was uploaded, so uploading a real care plan for a
// new resident produces that resident's profile.
// ============================================================

const has = (t: string, ...needles: string[]) =>
  needles.some((n) => t.includes(n));

/** Drop letterhead and field labels — "Taken by: D. Whitmore" is not a
 *  sentence about the resident, and its initials break sentence splitting. */
function bodyOf(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      const l = line.trim();
      if (!l) return false;
      if (/^[A-Z][A-Za-z ]{2,30}:\s*\S/.test(l)) return false; // Label: value
      if (/^[A-Z][A-Z .&—-]{4,}$/.test(l)) return false; // SECTION HEADING
      // A short line with no terminal punctuation is a title, not a
      // sentence — "Social Intake Note — Room 214" was being glued to
      // the first real sentence and surfacing in the profile.
      if (l.length < 70 && !/[.!?]$/.test(l)) return false;
      return true;
    })
    .join(" ");
}

/** Sentences, without splitting on initials like "D. Whitmore". */
function sentencesOf(raw: string): string[] {
  return bodyOf(raw)
    .replace(/\s+/g, " ")
    .split(/(?<![A-Z])(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter((x) => x.length > 12);
}

/** The sentence an organ or topic is actually discussed in. */
function sentenceAbout(raw: string, word: string): string {
  const hit = sentencesOf(raw).find((x) => x.toLowerCase().includes(word));
  return (hit ?? "").toLowerCase();
}

/** Words worth treating as an interest, mapped to the matcher's tags. */
// Word-boundary anchored. Loose substrings produced confident nonsense:
// "no falls recorded" matched `record` and gave the resident an interest
// in music; "in particular" matched `art`.
const INTERESTS: [RegExp, string][] = [
  [/\b(garden\w*|greenhouse|orchids?|allotment|plants?|flowers?)\b/, "gardening"],
  [/\b(cook\w*|bak(e|ing)|recipes?|culinary)\b/, "cooking"],
  [/\b(jazz|big band)\b/, "jazz"],
  [/\b(music|musical|sings?|singing|choir|piano|organ|records)\b/, "music"],
  [/\b(read\w*|books?|novels?|library|literature)\b/, "reading"],
  [/\b(art|arts|painting|paints?|draw\w*|sketch\w*|crafts?)\b/, "art"],
  [/\b(knit\w*|sew\w*|quilt\w*|crochet)\b/, "knitting"],
  [/\b(cards?|bridge|cribbage|dominoes)\b/, "cards"],
  [/\b(puzzles?|trivia|quiz|games?)\b/, "games"],
  [/\b(walks?|walking|exercise|strolls?|yoga)\b/, "exercise"],
  [/\b(birds?|nature|outdoors?|courtyard)\b/, "nature"],
  [/\b(baseball|football|sports?)\b/, "baseball"],
  [/\b(woodwork\w*|carpentry|workshop)\b/, "woodworking"],
  [/\b(films?|movies?|cinema|television)\b/, "film"],
  [/\b(history|current affairs|politics)\b/, "discussion"],
  [/\b(grandchild\w*|daughters?|sons?|family)\b/, "family"],
  [/\b(chats?|chatting|company|sociable|socialis\w*|socializ\w*)\b/, "socializing"],
];

function findInterests(t: string): string[] {
  const out: string[] = [];
  for (const [re, tag] of INTERESTS) {
    if (re.test(t) && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 6);
}

/** Clinical fields — the care plan is where these are stated. */
export function readCarePlan(
  residentId: string,
  raw: string
): ExtractionResponse {
  const t = bodyOf(raw).toLowerCase();

  const mobility = has(t, "wheelchair")
    ? ("wheelchair" as const)
    : has(t, "walker", "rollator")
      ? ("walker" as const)
      : has(t, "cane", "walking stick")
        ? ("cane" as const)
        : has(t, "independent", "unaided")
          ? ("independent" as const)
          : undefined;

  const fallRisk = has(t, "high fall risk", "increased fall risk")
    ? ("high" as const)
    : has(t, "moderate fall risk", "some fall risk")
      ? ("moderate" as const)
      : has(t, "low fall risk", "no falls", "steady on her feet", "steady on his feet")
        ? ("low" as const)
        : undefined;

  // Scoped to the sentence the organ is named in. A fixed character
  // window spilled into the next line — "Vision is within normal range"
  // was followed by "Mild cognitive impairment", so vision read as mild.
  const sensory = (organ: "hearing" | "vision") => {
    if (!t.includes(organ)) return undefined;
    const near = sentenceAbout(raw, organ);
    if (has(near, "severe")) return "severe" as const;
    if (has(near, "moderate")) return "moderate" as const;
    if (has(near, "mild")) return "mild" as const;
    if (has(near, "normal", "corrected", "no aids"))
      return "normal" as const;
    return undefined;
  };

  const cognition = has(t, "moderate cognitive")
    ? ("moderate_impairment" as const)
    : has(t, "mild cognitive")
      ? ("mild_impairment" as const)
      : has(t, "cognition intact", "cognitively intact", "no cognitive")
        ? ("intact" as const)
        : undefined;

  const preferredTimeOfDay = has(t, "best in the morning", "most alert in the morning", "prefers morning", "morning programming")
    ? ("morning" as const)
    : has(t, "alert in the afternoon", "prefers afternoon", "best in the afternoon")
      ? ("afternoon" as const)
      : has(t, "prefers evening", "best in the evening")
        ? ("evening" as const)
        : undefined;

  const constraints: string[] = [];
  if (has(t, "background noise", "competing noise", "crowded room"))
    constraints.push("avoid high-noise environments");
  if (has(t, "seated", "requires a seat")) constraints.push("seated activities");
  if (has(t, "supervision")) constraints.push("supervision required");

  return {
    residentId,
    careNeeds: { mobility, fallRisk, hearing: sensory("hearing"), vision: sensory("vision"), cognition },
    activityConstraints: constraints,
    preferredTimeOfDay,
    interests: findInterests(t),
  };
}

export interface ReadBackground {
  from?: string;
  career?: string;
  family?: string;
  routines?: string;
  notes?: string;
}

/**
 * Life history out of the intake note. Sentence-level rather than
 * keyword-level: these fields are read by a person, so a whole clause is
 * more useful than a tag.
 */
export function readBackground(raw: string): ReadBackground {
  const sentences = sentencesOf(raw);
  const used = new Set<string>();

  // One sentence per field. Without this, a sentence mentioning both a
  // hometown and a daughter filled From and Family with the same text.
  const pick = (re: RegExp) => {
    const hit = sentences.find((x) => !used.has(x) && re.test(x));
    if (!hit) return undefined;
    used.add(hit);
    return hit.length > 120 ? `${hit.slice(0, 117).trimEnd()}…` : hit;
  };

  return {
    from: pick(/\b(grew up|was born|moved here|originally from|comes from)\b/i),
    career: pick(/\b(taught|worked|career|retired|ran a|foreman|engineer|nurse|teacher)\b/i),
    family: pick(/\b(daughter|son|grandchild|husband|wife)\b/i),
    routines: pick(/\b(every morning|each morning|likes to|before breakfast|after lunch|routine)\b/i),
    notes: pick(/\b(kept|keeps|used to|for decades|for years)\b/i),
  };
}

/** Social fields — how they are with people. */
export function readIntake(residentId: string, raw: string): ExtractionResponse {
  const t = raw.toLowerCase();

  const quiet = has(t, "quiet", "reserved", "shy", "keeps to herself", "keeps to himself", "withdrawn");
  const talkative = has(t, "chatty", "talkative", "outgoing", "always chatting", "most social", "welcoming");

  const preferredGroupSize = has(t, "one to one", "one-to-one", "1:1", "prefers individual")
    ? ("one_on_one" as const)
    : has(t, "small group", "smaller group", "doesn't like huge", "does not like large", "happier in small", "finds a crowded room")
      ? ("small" as const)
      : has(t, "large group", "big group", "likes a crowd")
        ? ("large" as const)
        : undefined;

  return {
    residentId,
    interests: findInterests(t),
    personality: {
      introversion: quiet ? 0.7 : talkative ? 0.25 : 0.5,
      conversationalStyle: quiet ? "quiet" : talkative ? "talkative" : "balanced",
    },
    socialPreferences: { preferredGroupSize },
  };
}
