import { NextResponse } from "next/server";
import type { ResidentProfile } from "@shared/types";
import { scoreMatch, toResidentMatch } from "../../../../lib/matching/score-match";
import { explainMatch } from "../../../../lib/ai/explain-match";
import { eligibleCandidates } from "../../../../lib/candidates";
import { displayName, highRiskIds } from "@/lib/directory";

export async function POST(req: Request) {
  try {
    const { residentId, profile } = (await req.json()) as {
      residentId: string;
      profile: ResidentProfile;
    };
    if (!residentId || !profile) {
      return NextResponse.json({ error: "residentId and profile are required" }, { status: 400 });
    }

    const best = eligibleCandidates(residentId, profile, { highRiskIds: highRiskIds() })[0];
    if (!best) {
      return NextResponse.json({ error: "No eligible match on this floor" }, { status: 404 });
    }

    const result = scoreMatch(profile, best.profile);
    const rationale = await explainMatch(profile, best.profile, result.score, result.components, {
      a: displayName(residentId),
      b: displayName(best.profile.residentId),
    });

    return NextResponse.json({ ...toResidentMatch(profile, best.profile, result), rationale });
  } catch (error) {
    console.error("[/api/match]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
