// Sanity harness for the deterministic scorer. Run: npm run verify:matching
// Asserts the demo pair lands where the design doc says it does.

import { margaretProfile, helenProfile, robertProfile } from "../seed-data";
import { rankMatches, scoreMatch, hardFilters } from "../lib/matching/score-match";
import type { ResidentProfile } from "../types";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
}

console.log("\n=== Margaret + Helen (the demo pair) ===");
const mh = scoreMatch(margaretProfile, helenProfile);
console.table(mh.components);
console.log(`score: ${mh.score}`);
check("Margaret+Helen scores 92", mh.score, 92);
check("Margaret+Helen is eligible", mh.eligible, true);

console.log("\n=== Margaret + Robert (the control) ===");
const mr = scoreMatch(margaretProfile, robertProfile);
console.table(mr.components);
console.log(`score: ${mr.score}`);
check("Helen outranks Robert", mh.score > mr.score, true);

console.log("\n=== Ranking ===");
const ranked = rankMatches(margaretProfile, [helenProfile, robertProfile]);
ranked.forEach((r, i) => console.log(`${i + 1}. ${r.candidate.residentId} — ${r.score}`));
check("best match is Helen", ranked[0]?.candidate.residentId, "helen");

console.log("\n=== Hard filters ===");
check("self-match rejected", hardFilters(margaretProfile, margaretProfile).length > 0, true);

const eveningOwl: ResidentProfile = { ...helenProfile, residentId: "owl", preferredTimeOfDay: "evening" };
check("morning vs evening rejected", scoreMatch(margaretProfile, eveningOwl).eligible, false);

const deaf = (id: string): ResidentProfile => ({
  ...helenProfile,
  residentId: id,
  careNeeds: { ...helenProfile.careNeeds, hearing: "severe" },
});
check("two severely deaf residents rejected", scoreMatch(deaf("x"), deaf("y")).eligible, false);

const supervised = (id: string): ResidentProfile => ({
  ...helenProfile,
  residentId: id,
  careNeeds: { ...helenProfile.careNeeds, supervisionRequired: true },
});
check("two supervised residents rejected", scoreMatch(supervised("x"), supervised("y")).eligible, false);

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
