import {
  helenCarePlanText,
  helenIntakeText,
  margaretCarePlanText,
  margaretIntakeText,
} from "@shared/seed";

// Raw notes that feed the live extraction demo. Only Margaret and Helen
// are fully built — everyone else on the roster is risk data only, and
// their page says so rather than faking a profile.
export interface RawNotes {
  carePlan: string;
  intake: string;
}

const rawNotes: Record<string, RawNotes> = {
  margaret: { carePlan: margaretCarePlanText, intake: margaretIntakeText },
  helen: { carePlan: helenCarePlanText, intake: helenIntakeText },
};

export function notesFor(residentId: string): RawNotes | undefined {
  return rawNotes[residentId];
}
