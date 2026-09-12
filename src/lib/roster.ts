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
