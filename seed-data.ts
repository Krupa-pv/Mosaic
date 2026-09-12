import { Resident, ResidentProfile, SocialEvent } from "./types";

// ============================================================
// DEMO DATASET
// Margaret + Helen are the ONLY fully-built pair — every field
// populated, extraction inputs written, match hand-verified to
// look good. Robert exists only to make the dashboard/list look
// real (not used in the live demo flow).
// ============================================================

export const residents: Resident[] = [
  {
    id: "margaret",
    firstName: "Margaret",
    lastName: "Chen",
    roomNumber: "214",
    riskScore: 82,
    riskTrend: 31,
    riskLevel: "high",
    riskFactors: [
      "Social event attendance down 64% over 3 weeks",
      "Meals eaten in shared dining down 41%",
      "Staff notes increasingly mention withdrawal",
      "Family visits remain unchanged",
    ],
  },
  {
    id: "helen",
    firstName: "Helen",
    lastName: "Ortiz",
    roomNumber: "108",
    riskScore: 23,
    riskTrend: -4,
    riskLevel: "low",
    riskFactors: ["No significant change in social engagement"],
  },
  {
    id: "robert",
    firstName: "Robert",
    lastName: "Kowalski",
    roomNumber: "301",
    riskScore: 68,
    riskTrend: 13,
    riskLevel: "high",
    riskFactors: [
      "Meals eaten alone up sharply",
      "Declined last two group activities",
    ],
  },
];

// ---- Raw extraction inputs (feed these into the extraction demo live) ----

export const marginCarePlanText = `Margaret ambulates with a walker and has increased fall risk.
She has mild hearing impairment and mild cognitive impairment.
She enjoys gardening and previously participated in cooking groups.
She performs best in the morning and becomes fatigued later in the afternoon.`;

export const margaretIntakeText = `Margaret is pretty quiet until she knows someone. She loves gardening,
jazz, cooking shows and talking about her grandchildren. She doesn't like huge groups.`;

export const helenCarePlanText = `Helen ambulates with a walker. No cognitive concerns. Hearing and vision
within normal range. Prefers mornings, tires less easily than most residents on the floor.`;

export const helenIntakeText = `Helen is one of the most social residents on the floor — always chatting,
always welcoming new folks. She's been doing the Garden Circle since it started and loves anything
outdoors. She's also active in several other community events.`;

// ---- Pre-verified extracted profiles ----
// Use these as the FALLBACK if a live extraction call is slow/flaky during
// the recorded demo. Also useful to seed the UI before extraction is wired up.

export const margaretProfile: ResidentProfile = {
  residentId: "margaret",
  careNeeds: {
    mobility: "walker",
    fallRisk: "high",
    hearing: "mild",
    cognition: "mild_impairment",
  },
  activityConstraints: [],
  preferredTimeOfDay: "morning",
  interests: ["gardening", "jazz", "cooking"],
  personality: {
    introversion: 0.7,
    conversationalStyle: "quiet",
  },
  socialPreferences: {
    preferredGroupSize: "small",
  },
  personalityNote: "Initially reserved but becomes conversational after familiarity.",
};

export const helenProfile: ResidentProfile = {
  residentId: "helen",
  careNeeds: {
    mobility: "walker",
    fallRisk: "low",
    hearing: "normal",
    cognition: "intact",
  },
  activityConstraints: [],
  preferredTimeOfDay: "morning",
  interests: ["gardening", "community events", "socializing"],
  personality: {
    introversion: 0.2,
    conversationalStyle: "talkative",
  },
  socialPreferences: {
    preferredGroupSize: "small",
  },
  personalityNote: "Warm and welcoming, actively engaged in facility social life.",
};

// ---- Event catalog ----

export const events: SocialEvent[] = [
  {
    id: "garden-circle",
    title: "Indoor Garden Circle",
    startTime: "Wednesday 10:00 AM",
    location: "Sunroom",
    interests: ["gardening", "nature"],
    groupSize: "small",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
  {
    id: "jazz-hour",
    title: "Jazz Hour",
    startTime: "Thursday 2:00 PM",
    location: "Main Lounge",
    interests: ["jazz", "music"],
    groupSize: "large",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
  {
    id: "trivia",
    title: "Trivia",
    startTime: "Monday 3:00 PM",
    location: "Activity Room",
    interests: ["games", "socializing"],
    groupSize: "large",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
  {
    id: "book-club",
    title: "Book Club",
    startTime: "Tuesday 11:00 AM",
    location: "Library",
    interests: ["reading", "discussion"],
    groupSize: "small",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
  {
    id: "morning-walk",
    title: "Morning Walk",
    startTime: "Daily 8:30 AM",
    location: "Courtyard",
    interests: ["exercise", "nature"],
    groupSize: "small",
    accessibility: { wheelchairAccessible: true, seatedAvailable: false, physicalIntensity: "moderate" },
  },
  {
    id: "cooking-demo",
    title: "Cooking Demonstration",
    startTime: "Friday 1:00 PM",
    location: "Kitchen",
    interests: ["cooking"],
    groupSize: "small",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
  {
    id: "shared-breakfast",
    title: "Shared Breakfast",
    startTime: "Daily 8:00 AM",
    location: "Dining Room",
    interests: ["socializing"],
    groupSize: "large",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
  {
    id: "painting",
    title: "Painting",
    startTime: "Saturday 2:00 PM",
    location: "Art Room",
    interests: ["art"],
    groupSize: "small",
    accessibility: { wheelchairAccessible: true, seatedAvailable: true, physicalIntensity: "low" },
  },
];

// ---- Pre-verified demo rationale (fallback if live LLM call is slow) ----

export const margaretHelenRationale =
  "Margaret and Helen both enjoy gardening and prefer smaller social settings. Both use walkers " +
  "and are most active in the morning. Helen is also warm and socially engaged, which pairs well " +
  "as Margaret reconnects socially.";

export const margaretHelenEventReason =
  "Indoor Garden Circle is seated, small-group, and directly matches their shared interest in gardening — " +
  "and it runs Wednesday morning, when both residents have the most energy.";
