// Runs the real Margaret -> Helen pipeline against Azure OpenAI.
//   npm run verify:ai

import {
  margaretCarePlanText,
  margaretIntakeText,
  helenCarePlanText,
  helenIntakeText,
  margaretHelenRationale,
} from "../seed-data";
import { extractCarePlan } from "../lib/ai/extract-care-plan";
import { extractResidentIntake } from "../lib/ai/extract-intake";
import { mergeProfile } from "../lib/ai/merge-profile";
import { explainMatch } from "../lib/ai/explain-match";
import { scoreMatch } from "../lib/matching/score-match";

async function buildProfile(id: string, carePlan: string, intake: string) {
  const [fromCarePlan, fromIntake] = await Promise.all([
    extractCarePlan(id, carePlan),
    extractResidentIntake(id, intake),
  ]);
  return mergeProfile(id, fromCarePlan, fromIntake);
}

async function main() {
  console.log("\n--- extracting Margaret ---");
  const margaret = await buildProfile("margaret", margaretCarePlanText, margaretIntakeText);
  console.log(JSON.stringify(margaret.profile, null, 2));

  console.log("\n--- extracting Helen ---");
  const helen = await buildProfile("helen", helenCarePlanText, helenIntakeText);
  console.log(JSON.stringify(helen.profile, null, 2));

  console.log("\n--- scoring (deterministic, no LLM) ---");
  const result = scoreMatch(margaret.profile, helen.profile);
  console.table(result.components);
  console.log(`score: ${result.score}`);

  console.log("\n--- explaining (LLM, score passed in) ---");
  const rationale = await explainMatch(
    margaret.profile,
    helen.profile,
    result.score,
    result.components,
    { a: "Margaret", b: "Helen" },
    margaretHelenRationale,
  );
  console.log(rationale);
  console.log("");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
