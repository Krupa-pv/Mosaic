// Intake conversation (typed or voice transcript) -> social profile.
// This is the softer half: who the person is, not what they need clinically.

import type { ResidentProfile } from "../../types";
import { extractJSON, stripNulls, type JsonSchema } from "./client";

const INTAKE_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["interests", "personality", "socialPreferences", "personalityNote"],
  properties: {
    interests: {
      type: "array",
      items: { type: "string" },
      description: "Lowercase single-concept tags, e.g. gardening, jazz, cooking.",
    },
    personality: {
      type: "object",
      additionalProperties: false,
      required: ["introversion", "conversationalStyle"],
      properties: {
        introversion: {
          type: "number",
          description: "0 = highly outgoing, 1 = highly withdrawn. Judge from the text.",
        },
        conversationalStyle: {
          type: ["string", "null"],
          enum: ["quiet", "balanced", "talkative", null],
        },
      },
    },
    socialPreferences: {
      type: "object",
      additionalProperties: false,
      required: ["preferredGroupSize"],
      properties: {
        preferredGroupSize: {
          type: ["string", "null"],
          enum: ["one_on_one", "small", "large", null],
        },
      },
    },
    personalityNote: {
      type: ["string", "null"],
      description: "One sentence a staff member would find useful. Plain language.",
    },
  },
};

const SYSTEM = `You extract a social profile from nursing home intake notes.

The input may be a raw speech-to-text transcript: no punctuation, filler words,
false starts, repeated phrases. Read through that. Never treat a disfluency as
content, and never quote it back in personalityNote.

Rules:
- Only record what the text supports. Use null when it is not discussed.
- introversion is a 0-1 number. "quiet until she knows someone" is around 0.7.
  "one of the most social residents" is around 0.2.
- "doesn't like huge groups" means preferredGroupSize is "small", not "one_on_one",
  unless the text says they prefer one person at a time.
- Interests are lowercase single concepts, not sentences.
- Write multi-word interests with spaces: "community events", never "community_events".
- Do not emit near-duplicate tags. "cooking" and "cooking shows" are one interest.
- conversationalStyle describes how the resident presents by default, before they
  are comfortable. "quiet until she knows someone" is "quiet", not "balanced".
- personalityNote is one sentence, descriptive and non-clinical.`;

export async function extractResidentIntake(
  residentId: string,
  rawText: string,
  fallback?: Partial<ResidentProfile>,
): Promise<Partial<ResidentProfile>> {
  const raw = await extractJSON<Record<string, unknown>>({
    name: "intake_extraction",
    schema: INTAKE_SCHEMA,
    system: SYSTEM,
    user: rawText,
    fallback,
  });

  if (fallback !== undefined && raw === (fallback as unknown)) return fallback;

  const cleaned = stripNulls(raw);
  const personality = (cleaned.personality ?? {}) as Partial<ResidentProfile["personality"]>;

  return {
    residentId,
    ...(cleaned.interests ? { interests: cleaned.interests as string[] } : {}),
    personality: {
      introversion: personality.introversion ?? 0.5,
      ...(personality.conversationalStyle
        ? { conversationalStyle: personality.conversationalStyle }
        : {}),
    },
    socialPreferences: (cleaned.socialPreferences as ResidentProfile["socialPreferences"]) ?? {},
    ...(cleaned.personalityNote ? { personalityNote: cleaned.personalityNote as string } : {}),
  };
}
