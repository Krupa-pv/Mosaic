import { NextResponse } from "next/server";
import { buildFloorGraph } from "../../../../../lib/graph";
import { highRiskIds } from "@/lib/directory";

// The whole floor, every pair scored. Deterministic and LLM-free, so
// this route works with no Azure credentials configured.
export async function GET() {
  try {
    return NextResponse.json(buildFloorGraph({ highRiskIds: highRiskIds() }));
  } catch (error) {
    console.error("[/api/match/graph]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
