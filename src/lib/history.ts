"use client";

import { useMemo } from "react";
import { useOutcomes } from "./accepted";

// ============================================================
// What has already worked, per pair.
//
// Outcomes used to feed profile suggestions only — so "Mosaic learns
// from what worked" was true of the profile and not of the matching.
// This closes that: a pairing that went well is surfaced and promoted
// the next time the same two people are considered.
//
// It informs the ranking rather than rewriting the score. The
// compatibility number stays the deterministic function's, which is the
// claim the pitch rests on.
// ============================================================

export interface PairHistory {
  /** Sessions this pair attended together that went well. */
  wentWell: number;
  /** Sessions that didn't happen. */
  missed: number;
}

export function usePairHistory(subjectId: string) {
  const outcomes = useOutcomes();

  return useMemo(() => {
    const byEvent = new Map<string, Map<string, string>>();
    for (const o of outcomes) {
      const row = byEvent.get(o.eventId) ?? new Map<string, string>();
      row.set(o.residentId, o.outcome);
      byEvent.set(o.eventId, row);
    }

    const history = new Map<string, PairHistory>();
    for (const [, row] of byEvent) {
      const mine = row.get(subjectId);
      if (!mine) continue;
      for (const [otherId, theirs] of row) {
        if (otherId === subjectId) continue;
        const h = history.get(otherId) ?? { wentWell: 0, missed: 0 };
        // Both have to have been there for it to say anything about the pair.
        if (mine === "went_well" && theirs === "went_well") h.wentWell += 1;
        if (mine === "did_not_happen" || theirs === "did_not_happen") h.missed += 1;
        history.set(otherId, h);
      }
    }
    return history;
  }, [outcomes, subjectId]);
}
