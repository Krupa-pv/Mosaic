import { NextResponse } from "next/server";
import type { ResidentProfile } from "@shared/types";
import { events } from "@shared/seed";
import { planWeek, type Priority } from "../../../../lib/planner";
import { highRiskIds } from "@/lib/directory";

// Deterministic and LLM-free, so this works with no credentials set.
export async function POST(req: Request) {
  try {
    const { priorities, existing, extraProfiles } = (await req.json()) as {
      priorities: Priority[];
      existing?: Record<string, string[]>;
      extraProfiles?: Record<string, ResidentProfile>;
    };
    if (!Array.isArray(priorities) || priorities.length === 0) {
      return NextResponse.json({ error: "priorities are required" }, { status: 400 });
    }

    return NextResponse.json(
      planWeek({
        priorities,
        events,
        existing,
        extraProfiles,
        highRiskIds: highRiskIds(),
      }),
    );
  } catch (error) {
    console.error("[/api/plan-week]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
