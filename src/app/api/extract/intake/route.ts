import { NextResponse } from "next/server";
import type { IntakeExtractionRequest } from "@shared/types";
import { extractResidentIntake } from "../../../../../lib/ai/extract-intake";

export async function POST(req: Request) {
  try {
    const { residentId, rawText } = (await req.json()) as IntakeExtractionRequest;
    if (!residentId || !rawText?.trim()) {
      return NextResponse.json({ error: "residentId and rawText are required" }, { status: 400 });
    }
    return NextResponse.json(await extractResidentIntake(residentId, rawText));
  } catch (error) {
    console.error("[/api/extract/intake]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
