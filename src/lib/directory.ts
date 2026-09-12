// Roster-derived context the API routes hand to the matching layer.
// Kept in src/ because it reads Dev B's roster; lib/ stays alias-free.

import { allResidents } from "@/lib/roster";

export function displayName(residentId: string): string {
  return allResidents.find((r) => r.id === residentId)?.firstName ?? residentId;
}

/** Residents the risk detection already flags as withdrawing. */
export function highRiskIds(): Set<string> {
  return new Set(allResidents.filter((r) => r.riskLevel === "high").map((r) => r.id));
}
