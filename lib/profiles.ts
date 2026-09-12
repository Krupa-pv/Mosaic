// ============================================================
// Profile lookup for the whole floor.
//
// seed-data.ts holds the fully-built demo residents. Dev B's roster added
// eight more as dashboard filler with risk data only. Matching needs a
// profile for anyone who can appear as a candidate, so they get one here
// rather than in seed-data.ts, which stays the demo-critical file.
//
// These eight are deliberately weaker matches for Margaret than Helen is.
// ============================================================

import type { ResidentProfile } from "../types";
import { margaretProfile, helenProfile, robertProfile } from "../seed-data";

const rosterProfiles: ResidentProfile[] = [
  {
    residentId: "dorothy",
    careNeeds: { mobility: "cane", fallRisk: "moderate", hearing: "normal", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "morning",
    interests: ["music", "singing", "cards"],
    personality: { introversion: 0.72, conversationalStyle: "quiet" },
    socialPreferences: { preferredGroupSize: "small" },
    personalityNote: "Withdrew from group programming after her roommate transferred.",
  },
  {
    residentId: "arthur",
    careNeeds: { mobility: "cane", fallRisk: "low", hearing: "mild", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "afternoon",
    interests: ["baseball", "television", "cards"],
    personality: { introversion: 0.6, conversationalStyle: "balanced" },
    socialPreferences: { preferredGroupSize: "small" },
    personalityNote: "Talks readily about sport, less so about anything else.",
  },
  {
    residentId: "frances",
    careNeeds: { mobility: "walker", fallRisk: "moderate", hearing: "moderate", cognition: "intact" },
    activityConstraints: ["avoid high-noise environments until hearing aids are repaired"],
    preferredTimeOfDay: "morning",
    interests: ["reading", "poetry"],
    personality: { introversion: 0.55, conversationalStyle: "balanced" },
    socialPreferences: { preferredGroupSize: "small" },
    personalityNote: "Leaves events early, which staff attribute to the pending hearing aid repair.",
  },
  {
    residentId: "beatrice",
    careNeeds: { mobility: "independent", fallRisk: "low", hearing: "normal", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "afternoon",
    interests: ["art", "crafts"],
    personality: { introversion: 0.4, conversationalStyle: "balanced" },
    socialPreferences: { preferredGroupSize: "small" },
    personalityNote: "Settled quickly after the recent activity schedule change.",
  },
  {
    residentId: "walter",
    careNeeds: { mobility: "cane", fallRisk: "low", hearing: "normal", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "morning",
    interests: ["woodworking", "building"],
    personality: { introversion: 0.75, conversationalStyle: "quiet" },
    socialPreferences: { preferredGroupSize: "one_on_one" },
    personalityNote: "Prefers one-to-one visits and declines group programming.",
  },
  {
    residentId: "yolanda",
    careNeeds: { mobility: "independent", fallRisk: "low", hearing: "normal", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "afternoon",
    interests: ["reading", "books"],
    personality: { introversion: 0.25, conversationalStyle: "talkative" },
    socialPreferences: { preferredGroupSize: "small" },
    personalityNote: "Her week centres on the book club she recently joined.",
  },
  {
    residentId: "samuel",
    careNeeds: { mobility: "independent", fallRisk: "low", hearing: "normal", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "morning",
    interests: ["exercise", "walking"],
    personality: { introversion: 0.3, conversationalStyle: "balanced" },
    socialPreferences: { preferredGroupSize: "large" },
    personalityNote: "Participates consistently across the whole week.",
  },
  {
    residentId: "irene",
    careNeeds: { mobility: "cane", fallRisk: "low", hearing: "normal", cognition: "intact" },
    activityConstraints: [],
    preferredTimeOfDay: "afternoon",
    interests: ["family", "television"],
    personality: { introversion: 0.3, conversationalStyle: "talkative" },
    socialPreferences: { preferredGroupSize: "large" },
    personalityNote: "Dining room regular with steady family contact.",
  },
];

export const allProfiles: Record<string, ResidentProfile> = Object.fromEntries(
  [margaretProfile, helenProfile, robertProfile, ...rosterProfiles].map((p) => [p.residentId, p]),
);

export function profileFor(residentId: string): ResidentProfile | undefined {
  return allProfiles[residentId];
}

/** Everyone except the subject — the field the matcher ranks. */
export function candidatesFor(residentId: string): ResidentProfile[] {
  return Object.values(allProfiles).filter((p) => p.residentId !== residentId);
}
