// Care plan text -> structured clinical fields.
// The care plan is the authoritative clinical source: whatever it says
// about mobility, cognition and sensory needs wins over intake chat.

import type { ResidentProfile } from "../../types";
import { extractJSON, stripNulls, type JsonSchema } from "./client";

// Strict mode requires every property in `required`, so optional fields
// are declared nullable and stripped afterwards.
const CARE_PLAN_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["careNeeds", "activityConstraints", "interests", "preferredTimeOfDay"],
  properties: {
    careNeeds: {
      type: "object",
      additionalProperties: false,
      required: ["mobility", "fallRisk", "hearing", "vision", "cognition", "supervisionRequired"],
      properties: {
        mobility: { type: ["string", "null"], enum: ["independent", "cane", "walker", "wheelchair", null] },
        fallRisk: { type: ["string", "null"], enum: ["low", "moderate", "high", null] },
        hearing: { type: ["string", "null"], enum: ["normal", "mild", "moderate", "severe", null] },
        vision: { type: ["string", "null"], enum: ["normal", "mild", "moderate", "severe", null] },
        cognition: { type: ["string", "null"], enum: ["intact", "mild_impairment", "moderate_impairment", null] },
        supervisionRequired: { type: ["boolean", "null"] },
      },
    },
    activityConstraints: {
      type: "array",
      items: { type: "string" },
      description: "Short phrases describing what the resident should avoid.",
    },
    interests: {
      type: "array",
      items: { type: "string" },
      description: "Lowercase single-concept tags, e.g. gardening, cooking.",
    },
    preferredTimeOfDay: { type: ["string", "null"], enum: ["morning", "afternoon", "evening", null] },
  },
};

const SYSTEM = `You extract structured fields from nursing home care plans.

Rules:
- Only record what the text states or directly implies. Never infer a clinical
  finding that is not supported by the text.
- Use null for anything the care plan does not mention. Do not guess.
- "increased fall risk" means high fall risk. "no cognitive concerns" means intact.
- Interests are lowercase single concepts: "gardening", not "enjoys gardening".
- Write multi-word interests with spaces: "community events", never "community_events".
- Do not emit near-duplicate tags. "cooking" and "cooking shows" are one interest.
- preferredTimeOfDay is when the resident has the most energy.`;

export async function extractCarePlan(
  residentId: string,
  rawText: string,
  fallback?: Partial<ResidentProfile>,
): Promise<Partial<ResidentProfile>> {
  const raw = await extractJSON<Record<string, unknown>>({
    name: "care_plan_extraction",
    schema: CARE_PLAN_SCHEMA,
    system: SYSTEM,
    user: rawText,
    fallback,
  });

  // The fallback path already returns a finished profile fragment.
  if (fallback !== undefined && raw === (fallback as unknown)) return fallback;

  const cleaned = stripNulls(raw);
  return {
    residentId,
    careNeeds: (cleaned.careNeeds as ResidentProfile["careNeeds"]) ?? {},
    activityConstraints: (cleaned.activityConstraints as string[]) ?? [],
    ...(cleaned.interests ? { interests: cleaned.interests as string[] } : {}),
    ...(cleaned.preferredTimeOfDay
      ? { preferredTimeOfDay: cleaned.preferredTimeOfDay as ResidentProfile["preferredTimeOfDay"] }
      : {}),
  };
}
