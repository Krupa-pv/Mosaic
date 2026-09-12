"use client";

import type { Resident } from "@shared/types";
import { useFlowResults } from "./ResidentFlowProvider";
import InterventionList from "./InterventionList";

/**
 * Bridges the flow state into the ranking. Once a profile exists, the
 * ranking uses it — how reserved they are, what group size suits them —
 * so the order changes as you learn more about the resident.
 */
export default function ResidentInterventions({
  resident,
}: {
  resident: Resident;
}) {
  const { extracted, merged } = useFlowResults();
  return (
    <InterventionList
      resident={resident}
      profile={extracted ? merged : undefined}
    />
  );
}
