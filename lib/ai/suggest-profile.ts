// Reads accumulated daily notes and proposes profile amendments.
//
// "You've mentioned gardening in four notes — add it to her interests?"
//
// The deterministic pass does the actual detection, so this works with
// no Azure credentials at all. The LLM only rewrites the reasons into
// something a caregiver would say, and can add a note-derived
// suggestion the keyword pass would miss. It never invents a field
// value the notes don't support.

import type { ResidentProfile } from "../../types";
import { extractJSON } from "./client";
import { norm } from "../matching/interests";

export interface ProfileSuggestion {
  /** What to change. `interest` adds a tag; the rest set a field. */
  kind: "interest" | "groupSize" | "timeOfDay" | "conversation";
  value: string;
  /** How many notes support it. */
  support: number;
  reason: string;
}

export interface SuggestInput {
  profile: ResidentProfile;
  notes: { text: string; sentiment: string }[];
}

/** Terms worth proposing as interests, kept to things activities key on. */
const TOPICS = [
  "gardening",
  "jazz",
  "music",
  "cooking",
  "baking",
  "reading",
  "books",
  "art",
  "painting",
  "knitting",
  "cards",
  "games",
  "puzzles",
  "birds",
  "walking",
  "exercise",
  "dancing",
  "films",
  "history",
  "grandchildren",
  "family",
  "baseball",
  "woodworking",
];

const SYNONYMS: Record<string, string> = {
  books: "reading",
  baking: "cooking",
  films: "film",
  puzzles: "games",
};

const MIN_SUPPORT = 2;

/** Detection — pure counting, no model. */
export function detectSuggestions({
  profile,
  notes,
}: SuggestInput): ProfileSuggestion[] {
  const have = new Set(profile.interests.map(norm));
  const counts = new Map<string, number>();

  for (const note of notes) {
    const text = ` ${norm(note.text)} `;
    const seen = new Set<string>();
    for (const topic of TOPICS) {
      if (!text.includes(` ${topic} `) && !text.includes(`${topic}`)) continue;
      const canonical = SYNONYMS[topic] ?? topic;
      if (have.has(canonical) || seen.has(canonical)) continue;
      seen.add(canonical);
      counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
    }
  }

  const out: ProfileSuggestion[] = [];
  for (const [value, support] of counts) {
    if (support < MIN_SUPPORT) continue;
    out.push({
      kind: "interest",
      value,
      support,
      reason: `Mentioned in ${support} notes but not on the profile.`,
    });
  }

  // Repeated "didn't happen" on group activities hints the group size is
  // wrong — a real signal, and one staff would otherwise have to spot.
  const misses = notes.filter((n) => n.sentiment === "didnt_happen").length;
  if (misses >= MIN_SUPPORT && profile.socialPreferences.preferredGroupSize !== "one_on_one") {
    out.push({
      kind: "groupSize",
      value: "one_on_one",
      support: misses,
      reason: `${misses} sessions didn't happen. A one-to-one visit may land better than a group.`,
    });
  }

  return out.sort((a, b) => b.support - a.support);
}

/**
 * Same suggestions, with the reasons rewritten by the model. Falls back
 * to the deterministic reasons whenever the call fails, so the feature
 * degrades to "works, just plainer".
 */
export async function suggestProfileUpdates(
  input: SuggestInput
): Promise<ProfileSuggestion[]> {
  const detected = detectSuggestions(input);
  if (detected.length === 0) return [];

  try {
    const result = await extractJSON<{ suggestions: ProfileSuggestion[] }>({
      name: "profile_suggestions",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["suggestions"],
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "value", "support", "reason"],
              properties: {
                kind: {
                  type: "string",
                  enum: ["interest", "groupSize", "timeOfDay", "conversation"],
                },
                value: { type: "string" },
                support: { type: "number" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
      system:
        "You help a care home nurse keep a resident's social profile current. " +
        "You are given candidate profile changes that were detected by counting " +
        "mentions across daily notes, plus the notes themselves. Keep the same " +
        "kind, value and support for each candidate — do not invent new ones and " +
        "do not drop any. Rewrite only `reason` into one short, concrete sentence " +
        "a nurse would recognise, quoting what was actually observed. Never claim " +
        "anything the notes do not say.",
      user: JSON.stringify({
        candidates: detected,
        notes: input.notes.map((n) => n.text),
        currentInterests: input.profile.interests,
      }),
      fallback: { suggestions: detected },
    });

    // Trust our own detection for what changes; take only the wording.
    return detected.map((d) => {
      const match = result.suggestions.find(
        (s) => s.kind === d.kind && norm(s.value) === norm(d.value)
      );
      return match?.reason ? { ...d, reason: match.reason } : d;
    });
  } catch {
    return detected;
  }
}
