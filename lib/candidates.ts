// Ranks the floor against one resident.
//
// Deliberately free of Next.js and of Dev B's path aliases so the verify
// scripts can import it directly. Anything that needs the roster (names,
// risk levels) is passed in by the route.

import type { MatchComponents, ResidentProfile } from "../types";
import { scoreMatch } from "./matching/score-match";
import { describeCandidate } from "./matching/describe";
import { candidatesFor } from "./profiles";

export interface RankedCandidate {
  profile: ResidentProfile;
  score: number;
  components: MatchComponents;
  note: string;
  /** True when a filter removed them before weighted scoring counted. */
  filtered: boolean;
}

export interface RankOptions {
  /**
   * Residents already at high isolation risk. Pairing two withdrawing
   * residents is the thing this product exists to avoid, so they are
   * filtered out rather than ranked low. Risk lives on the roster, not on
   * the profile, which is why it arrives as a parameter.
   */
  highRiskIds?: Set<string>;
}

export function rankCandidates(
  subjectId: string,
  subject: ResidentProfile,
  { highRiskIds }: RankOptions = {},
): RankedCandidate[] {
  const subjectAtRisk = highRiskIds?.has(subjectId) ?? false;

  return candidatesFor(subjectId)
    .map((profile) => {
      const result = scoreMatch(subject, profile);
      const bothWithdrawing = subjectAtRisk && (highRiskIds?.has(profile.residentId) ?? false);

      const note = bothWithdrawing
        ? "Filtered out: also at elevated isolation risk. Mosaic won't pair two withdrawing residents."
        : result.eligible
          ? describeCandidate(subject, profile, result.components)
          : `Filtered out: ${result.disqualifiers[0]}`;

      return {
        profile,
        score: bothWithdrawing || !result.eligible ? 0 : result.score,
        components: result.components,
        note,
        filtered: bothWithdrawing || !result.eligible,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Ranked, filtered removed — what /api/match picks its winner from. */
export function eligibleCandidates(
  subjectId: string,
  subject: ResidentProfile,
  options: RankOptions = {},
): RankedCandidate[] {
  return rankCandidates(subjectId, subject, options).filter((c) => !c.filtered);
}
