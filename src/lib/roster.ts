import type { Resident } from "@shared/types";
import { residents as seedResidents } from "@shared/seed";

// ============================================================
// FLOOR ROSTER — dashboard-level only.
//
// Deliberately NOT in seed-data.ts: that file is Dev A's, and these
// residents are pure list filler so the dashboard reads like a real
// floor instead of a three-row demo.
//
// Risk numbers only — no profiles, no notes, no matching data. Section 2
// of the design doc rules out a 10-15 resident seed set, and it's right
// to: the cost there is building profiles, which we haven't done. Only
// Margaret and Helen are fully built.
//
// Every score stays below Margaret's 82 so she remains the top of the
// list and the subject of the dashboard alert.
// ============================================================

const floorResidents: Resident[] = [
  {
    id: "dorothy",
    firstName: "Dorothy",
    lastName: "Ferrante",
    roomNumber: "305",
    riskScore: 74,
    riskTrend: 18,
    riskLevel: "high",
    riskFactors: [
      "Stopped attending weekly music group",
      "Roommate transferred off the floor 3 weeks ago",
      "Increased time in room during activity hours",
    ],
  },
  {
    id: "arthur",
    firstName: "Arthur",
    lastName: "Nwosu",
    roomNumber: "226",
    riskScore: 61,
    riskTrend: 9,
    riskLevel: "moderate",
    riskFactors: [
      "Group activity attendance down 22%",
      "Fewer recorded conversations with staff",
    ],
  },
  {
    id: "frances",
    firstName: "Frances",
    lastName: "Lindqvist",
    roomNumber: "117",
    riskScore: 55,
    riskTrend: 6,
    riskLevel: "moderate",
    riskFactors: [
      "Attends events but leaves early",
      "Hearing aid repairs pending for 2 weeks",
    ],
  },
  {
    id: "beatrice",
    firstName: "Beatrice",
    lastName: "Ramos",
    roomNumber: "120",
    riskScore: 47,
    riskTrend: -3,
    riskLevel: "moderate",
    riskFactors: ["Engagement steady after recent activity change"],
  },
  {
    id: "walter",
    firstName: "Walter",
    lastName: "Pruitt",
    roomNumber: "233",
    riskScore: 42,
    riskTrend: 2,
    riskLevel: "moderate",
    riskFactors: ["Prefers one-to-one visits over group programming"],
  },
  {
    id: "yolanda",
    firstName: "Yolanda",
    lastName: "Briggs",
    roomNumber: "142",
    riskScore: 34,
    riskTrend: -7,
    riskLevel: "low",
    riskFactors: ["Attendance up since joining the book club"],
  },
  {
    id: "samuel",
    firstName: "Samuel",
    lastName: "Adeyemi",
    roomNumber: "318",
    riskScore: 29,
    riskTrend: 1,
    riskLevel: "low",
    riskFactors: ["Consistent participation across the week"],
  },
  {
    id: "eleanor",
    firstName: "Eleanor",
    lastName: "Whitfield",
    roomNumber: "118",
    // Admitted two days ago. No baseline yet, so the score is a
    // placeholder until there's something to measure.
    riskScore: 50,
    riskTrend: 0,
    riskLevel: "moderate",
    riskFactors: [
      "Admitted 2 days ago — no baseline yet",
      "No care plan or intake note on file",
    ],
  },
  {
    id: "irene",
    firstName: "Irene",
    lastName: "Kaminski",
    roomNumber: "209",
    riskScore: 21,
    riskTrend: -5,
    riskLevel: "low",
    riskFactors: ["Daily dining room meals, regular family contact"],
  },
];

/** Everyone shown on the dashboard. Dev A's seed residents come first. */
export const allResidents: Resident[] = [...seedResidents, ...floorResidents];

export function findResident(id: string): Resident | undefined {
  return allResidents.find((r) => r.id === id);
}

/** Recently admitted — shown on the roster until a profile exists. */
const newAdmissions: Record<string, string> = {
  eleanor: "Admitted 2 days ago",
};

export function admissionNote(residentId: string): string | undefined {
  return newAdmissions[residentId];
}

// ============================================================
// RISK HISTORY — six weekly readings, oldest first.
//
// Hardcoded like the risk score itself (§2 cuts the live detection
// engine). Each series ends on that resident's current riskScore, and
// the last three readings move by exactly their riskTrend, so the chart
// and the "+31 in 3 weeks" number can never disagree.
// ============================================================

export const WEEKS = 6;

const riskHistory: Record<string, number[]> = {
  margaret: [48, 49, 51, 62, 71, 82],
  helen: [27, 25, 24, 26, 24, 23],
  robert: [51, 53, 55, 60, 64, 68],
  dorothy: [53, 54, 56, 63, 69, 74],
  arthur: [50, 51, 52, 55, 58, 61],
  frances: [47, 48, 49, 51, 53, 55],
  beatrice: [52, 51, 50, 49, 48, 47],
  walter: [38, 39, 40, 41, 41, 42],
  yolanda: [43, 42, 41, 39, 36, 34],
  samuel: [30, 29, 28, 28, 29, 29],
  irene: [28, 27, 26, 25, 23, 21],
  // No history yet — she arrived two days ago.
  eleanor: [],
};

export function historyFor(residentId: string): number[] {
  const h = riskHistory[residentId];
  if (h) return h;
  // Anyone without history flat-lines at their current score rather than
  // showing an invented trend.
  const r = findResident(residentId);
  return r ? Array(WEEKS).fill(r.riskScore) : [];
}

/** Floor average per week — derived from every resident, not invented.
 *  Residents with no history yet are excluded rather than counted as
 *  zero, which would drag the average down for everyone else. */
export function floorAverage(): number[] {
  const series = allResidents
    .map((r) => historyFor(r.id))
    .filter((h) => h.length === WEEKS);
  if (series.length === 0) return Array(WEEKS).fill(0);
  return Array.from({ length: WEEKS }, (_, i) =>
    Math.round(series.reduce((sum, s) => sum + s[i], 0) / series.length)
  );
}
