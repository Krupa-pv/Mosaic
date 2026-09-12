// The full definition-of-done sequence, end to end, against live Azure.
//   npm run verify:demo

import {
  residents,
  events,
  margaretCarePlanText,
  margaretIntakeText,
  helenCarePlanText,
  helenIntakeText,
  robertProfile,
  margaretHelenRationale,
  margaretHelenEventReason,
} from "../seed-data";
import { extractCarePlan } from "../lib/ai/extract-care-plan";
import { extractResidentIntake } from "../lib/ai/extract-intake";
import { mergeProfile } from "../lib/ai/merge-profile";
import { rankMatches } from "../lib/matching/score-match";
import { buildSocialPrescription } from "../lib/prescription";

async function buildProfile(id: string, carePlan: string, intake: string) {
  const [fromCarePlan, fromIntake] = await Promise.all([
    extractCarePlan(id, carePlan),
    extractResidentIntake(id, intake),
  ]);
  return mergeProfile(id, fromCarePlan, fromIntake).profile;
}

async function main() {
  const margaretRow = residents.find((r) => r.id === "margaret")!;
  console.log(`\n1. DASHBOARD — ${margaretRow.firstName} ${margaretRow.lastName}, risk ${margaretRow.riskScore} (up ${margaretRow.riskTrend})`);
  for (const factor of margaretRow.riskFactors) console.log(`     - ${factor}`);

  console.log("\n2. EXTRACTION (live)");
  const [margaret, helen] = await Promise.all([
    buildProfile("margaret", margaretCarePlanText, margaretIntakeText),
    buildProfile("helen", helenCarePlanText, helenIntakeText),
  ]);
  console.log(`   Margaret: ${margaret.careNeeds.mobility}, ${margaret.careNeeds.cognition}, ${margaret.preferredTimeOfDay}`);
  console.log(`   Interests: ${margaret.interests.join(", ")}`);

  console.log("\n3. MATCHING (deterministic)");
  for (const r of rankMatches(margaret, [helen, robertProfile])) {
    console.log(`   ${r.candidate.residentId.padEnd(8)} ${r.score}`);
  }

  console.log("\n4. SOCIAL PRESCRIPTION");
  const result = await buildSocialPrescription({
    a: margaret,
    b: helen,
    names: { a: "Margaret", b: "Helen" },
    events,
    fallbacks: { rationale: margaretHelenRationale, eventFitReason: margaretHelenEventReason },
  });

  const p = result.prescription;
  if (!p) {
    console.log("   none:", result.disqualifiers.join("; "));
    process.exit(1);
  }

  console.log(`   Pair:  Margaret + Helen — ${p.match.score}%`);
  console.log(`   Event: ${p.event.title}, ${p.event.startTime}, ${p.event.location}`);
  console.log(`\n   Why them: ${p.match.rationale}`);
  console.log(`\n   Why this: ${p.eventFitReason}`);

  console.log("\n   Alternatives considered:");
  for (const alt of result.alternatives.slice(0, 4)) {
    console.log(`     ${alt.score.toString().padStart(3)}  ${alt.event.title}`);
  }
  console.log("\n   Filtered out:");
  for (const r of result.rejected) console.log(`     --   ${r.disqualifiers[0]}`);

  console.log(`\n5. STAFF ACCEPTS — status moves "${p.status}" -> "accepted"\n`);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
