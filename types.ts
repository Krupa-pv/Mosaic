// ============================================================
// LOCKED TYPES — do not change without re-syncing with the other dev.
// Both frontend and backend import from this single file.
// ============================================================

export type Mobility = "independent" | "cane" | "walker" | "wheelchair";
export type Cognition = "intact" | "mild_impairment" | "moderate_impairment";
export type SensoryLevel = "normal" | "mild" | "moderate" | "severe";
export type GroupSize = "one_on_one" | "small" | "large";
export type ConversationalStyle = "quiet" | "balanced" | "talkative";

// ---- Resident (dashboard-level entity) ----
export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  // Hardcoded for the hackathon — no live risk engine.
  riskScore: number; // 0-100
  riskTrend: number; // e.g. +31 = risk rose 31 points
  riskLevel: "low" | "moderate" | "high";
  riskFactors: string[]; // pre-written strings, e.g. "Event attendance down 64%"
}

// ---- ResidentProfile (built via extraction) ----
export interface ResidentProfile {
  residentId: string;

  // From care plan extraction
  careNeeds: {
    mobility?: Mobility;
    fallRisk?: "low" | "moderate" | "high";
    hearing?: SensoryLevel;
    vision?: SensoryLevel;
    cognition?: Cognition;
    supervisionRequired?: boolean;
  };
  activityConstraints: string[]; // e.g. "no high-noise environments"
  preferredTimeOfDay?: "morning" | "afternoon" | "evening";

  // From intake extraction (text or voice)
  interests: string[]; // e.g. ["gardening", "jazz", "cooking"]
  personality: {
    introversion: number; // 0-1
    conversationalStyle?: ConversationalStyle;
  };
  socialPreferences: {
    preferredGroupSize?: GroupSize;
  };
  personalityNote?: string;

  // Provenance (optional, nice for the extraction UI to show)
  source?: {
    field: string;
    from: "care_plan" | "intake";
  }[];
}

// ---- SocialEvent ----
export interface SocialEvent {
  id: string;
  title: string;
  startTime: string; // display string, e.g. "Wednesday 10:00 AM"
  location: string;
  interests: string[]; // tags this event maps to
  groupSize: GroupSize;
  accessibility: {
    wheelchairAccessible: boolean;
    seatedAvailable: boolean;
    physicalIntensity: "low" | "moderate" | "high";
  };
}

// ---- ResidentMatch (output of matching) ----
export interface MatchComponents {
  interests: number; // 0-100
  socialPreferences: number;
  careCompatibility: number;
  schedule: number;
  personality: number;
  complementaryTraits: number;
}

export interface ResidentMatch {
  id: string;
  residentAId: string;
  residentBId: string;
  score: number; // 0-100, deterministic — never set by the LLM
  components: MatchComponents;
  rationale: string; // LLM-generated plain-language explanation
  status: "suggested" | "accepted" | "declined";
}

// ---- Combined recommendation (resident + resident + event) ----
export interface SocialPrescription {
  id: string;
  match: ResidentMatch;
  event: SocialEvent;
  eventFitReason: string; // LLM-generated, e.g. "seated, small group, shared interest in gardening"
  status: "suggested" | "accepted" | "declined";
}

// ---- API payload shapes (for the extraction endpoints) ----
export interface CarePlanExtractionRequest {
  residentId: string;
  rawText: string;
}

export interface IntakeExtractionRequest {
  residentId: string;
  rawText: string; // typed or transcribed from voice
}

// Both extraction endpoints return a Partial<ResidentProfile> —
// the merge step (care plan wins on conflict) combines them into one.
export type ExtractionResponse = Partial<ResidentProfile>;
