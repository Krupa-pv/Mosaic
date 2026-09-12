import { NextResponse } from "next/server";
import type { ResidentMatch, ResidentProfile } from "@shared/types";
import { events } from "@shared/seed";
import { buildSocialPrescription } from "../../../../lib/prescription";
import { profileFor } from "../../../../lib/profiles";
import { displayName } from "@/lib/directory";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      match: ResidentMatch;
      // Optional. Event fit depends on accessibility, so the live extracted
      // profiles are more accurate than the seeded ones we fall back to.
      profileA?: ResidentProfile;
      profileB?: ResidentProfile;
    };

    const { match } = body;
    if (!match?.residentAId || !match?.residentBId) {
      return NextResponse.json({ error: "match is required" }, { status: 400 });
    }

    const a = body.profileA ?? profileFor(match.residentAId);
    const b = body.profileB ?? profileFor(match.residentBId);
    if (!a || !b) {
      return NextResponse.json(
        { error: `No profile for ${!a ? match.residentAId : match.residentBId}` },
        { status: 404 },
      );
    }

    const result = await buildSocialPrescription({
      a,
      b,
      names: { a: displayName(match.residentAId), b: displayName(match.residentBId) },
      events,
    });

    if (!result.prescription) {
      return NextResponse.json(
        { error: result.disqualifiers[0] ?? "No accessible activity fits this pair" },
        { status: 404 },
      );
    }

    // Keep the score the matcher already computed rather than recomputing it.
    return NextResponse.json({ ...result.prescription, match });
  } catch (error) {
    console.error("[/api/recommend]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
