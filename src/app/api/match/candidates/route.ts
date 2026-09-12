import { NextResponse } from "next/server";
import type { ResidentProfile } from "@shared/types";
import { rankCandidates } from "../../../../../lib/candidates";
import { highRiskIds } from "@/lib/directory";

export async function POST(req: Request) {
  try {
    const { residentId, profile } = (await req.json()) as {
      residentId: string;
      profile: ResidentProfile;
    };
    if (!residentId || !profile) {
      return NextResponse.json({ error: "residentId and profile are required" }, { status: 400 });
    }

    // Shape matches MatchCandidate in src/lib/api.ts.
    const candidates = rankCandidates(residentId, profile, { highRiskIds: highRiskIds() }).map(
      (c) => ({
        residentId: c.profile.residentId,
        score: c.score,
        note: c.note,
        ...(c.filtered ? { filtered: true } : {}),
      }),
    );

    return NextResponse.json(candidates);
  } catch (error) {
    console.error("[/api/match/candidates]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
