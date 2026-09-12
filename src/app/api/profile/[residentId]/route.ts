import { NextResponse } from "next/server";
import { profileFor } from "../../../../../lib/profiles";

// The profile already on file. Deterministic, no model — so a resident
// who has been profiled before opens straight into it rather than making
// staff re-run extraction every visit.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ residentId: string }> },
) {
  const { residentId } = await params;
  const profile = profileFor(residentId);
  if (!profile) {
    return NextResponse.json({ error: "No profile on file" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
