import { NextResponse } from "next/server";
import type { ResidentProfile } from "@shared/types";
import { suggestProfileUpdates } from "../../../../../lib/ai/suggest-profile";

// Detection is deterministic (counting mentions), so this returns useful
// suggestions even with no Azure credentials — the model only rewrites
// the reasons, and falls back to the plain ones when unavailable.
export async function POST(req: Request) {
  try {
    const { profile, notes } = (await req.json()) as {
      profile: ResidentProfile;
      notes: { text: string; sentiment: string }[];
    };
    if (!profile) {
      return NextResponse.json({ error: "profile is required" }, { status: 400 });
    }
    return NextResponse.json(
      await suggestProfileUpdates({ profile, notes: notes ?? [] }),
    );
  } catch (error) {
    console.error("[/api/profile/suggestions]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
