import { NextResponse } from "next/server";
import type { CarePlanExtractionRequest } from "@shared/types";
import { extractCarePlan } from "../../../../../lib/ai/extract-care-plan";

export async function POST(req: Request) {
  try {
    const { residentId, rawText } = (await req.json()) as CarePlanExtractionRequest;
    if (!residentId || !rawText?.trim()) {
      return NextResponse.json({ error: "residentId and rawText are required" }, { status: 400 });
    }
    return NextResponse.json(await extractCarePlan(residentId, rawText));
  } catch (error) {
    // Returning 500 lets the client fall back to its seeded copy.
    console.error("[/api/extract/care-plan]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
