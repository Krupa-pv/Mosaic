// Combines the two extractions into one ResidentProfile.
// Care plan wins on conflict — it is the clinical record, and the intake
// conversation is secondhand recollection.

import type { ResidentProfile } from "../../types";

export interface MergeResult {
  profile: ResidentProfile;
  /** Which source supplied each field — drives the provenance chips in the UI. */
  source: NonNullable<ResidentProfile["source"]>;
  /** Fields both sources spoke to, where the care plan overrode the intake. */
  conflicts: string[];
}

export function mergeProfile(
  residentId: string,
  fromCarePlan: Partial<ResidentProfile>,
  fromIntake: Partial<ResidentProfile>,
): MergeResult {
  const source: NonNullable<ResidentProfile["source"]> = [];
  const conflicts: string[] = [];

  const claim = (field: string, from: "care_plan" | "intake") => {
    source.push({ field, from });
  };

  // Clinical fields only ever come from the care plan.
  const careNeeds = fromCarePlan.careNeeds ?? {};
  for (const key of Object.keys(careNeeds)) claim(`careNeeds.${key}`, "care_plan");

  const activityConstraints = fromCarePlan.activityConstraints ?? [];
  if (activityConstraints.length > 0) claim("activityConstraints", "care_plan");

  // Interests: union of both, care-plan ordering first, de-duplicated.
  const carePlanInterests = fromCarePlan.interests ?? [];
  const intakeInterests = fromIntake.interests ?? [];
  const seen = new Set<string>();
  const interests: string[] = [];
  for (const interest of [...carePlanInterests, ...intakeInterests]) {
    const key = interest.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    interests.push(key);
  }
  // The model sometimes emits a tag and a longer variant of it ("cooking",
  // "cooking shows"). Keep the shorter one — it matches more broadly.
  const deduped = interests.filter(
    (tag) => !interests.some((other) => other !== tag && tag.startsWith(`${other} `)),
  );

  if (carePlanInterests.length > 0) claim("interests", "care_plan");
  if (intakeInterests.length > 0) claim("interests", "intake");

  // Time of day: the care plan describes observed energy, so it wins.
  const timeOfDay = fromCarePlan.preferredTimeOfDay ?? fromIntake.preferredTimeOfDay;
  if (timeOfDay) {
    const from = fromCarePlan.preferredTimeOfDay ? "care_plan" : "intake";
    claim("preferredTimeOfDay", from);
    if (
      fromCarePlan.preferredTimeOfDay &&
      fromIntake.preferredTimeOfDay &&
      fromCarePlan.preferredTimeOfDay !== fromIntake.preferredTimeOfDay
    ) {
      conflicts.push("preferredTimeOfDay");
    }
  }

  // Personality and social preference are intake-only concepts.
  const personality = {
    introversion: fromIntake.personality?.introversion ?? 0.5,
    ...(fromIntake.personality?.conversationalStyle
      ? { conversationalStyle: fromIntake.personality.conversationalStyle }
      : {}),
  };
  if (fromIntake.personality) claim("personality", "intake");

  const socialPreferences = fromIntake.socialPreferences ?? {};
  if (fromIntake.socialPreferences?.preferredGroupSize) {
    claim("socialPreferences.preferredGroupSize", "intake");
  }

  const personalityNote = fromIntake.personalityNote;
  if (personalityNote) claim("personalityNote", "intake");

  const profile: ResidentProfile = {
    residentId,
    careNeeds,
    activityConstraints,
    ...(timeOfDay ? { preferredTimeOfDay: timeOfDay } : {}),
    interests: deduped,
    personality,
    socialPreferences,
    ...(personalityNote ? { personalityNote } : {}),
    source,
  };

  return { profile, source, conflicts };
}
