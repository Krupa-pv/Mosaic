// The floor as a graph: every resident, every pair, one score each.
//
// Deliberately free of Next.js and of Dev B's path aliases, matching the
// rest of lib/, so the verify scripts can import it directly.
//
// This reuses scoreMatch rather than reimplementing anything — there is
// exactly one scorer in this codebase, which is the claim the pitch
// rests on.

import type { MatchComponents, ResidentProfile } from "../types";
import { hardFilters, scoreMatch } from "./matching/score-match";
import { allProfiles } from "./profiles";

export interface GraphNode {
  residentId: string;
  /** Mean score against everyone they *can* be paired with. */
  affinity: number;
  /** How many eligible partners clear the display threshold. */
  degree: number;
}

export interface GraphEdge {
  a: string;
  b: string;
  score: number;
  components: MatchComponents;
  /** Set when a hard filter rules the pair out; score is then 0. */
  blockedBy?: string;
}

export interface FloorGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Edges at or above this are worth drawing as a connection. */
  threshold: number;
}

export const EDGE_THRESHOLD = 60;

export interface GraphOptions {
  /** Two withdrawing residents are never paired — same rule as ranking. */
  highRiskIds?: Set<string>;
}

export function buildFloorGraph({ highRiskIds }: GraphOptions = {}): FloorGraph {
  const ids = Object.keys(allProfiles);
  const edges: GraphEdge[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      edges.push(scorePair(a, b, allProfiles[a], allProfiles[b], highRiskIds));
    }
  }

  const nodes = ids.map((residentId) => {
    const mine = edges.filter(
      (e) => (e.a === residentId || e.b === residentId) && !e.blockedBy
    );
    const total = mine.reduce((sum, e) => sum + e.score, 0);
    return {
      residentId,
      affinity: mine.length ? Math.round(total / mine.length) : 0,
      degree: mine.filter((e) => e.score >= EDGE_THRESHOLD).length,
    };
  });

  return { nodes, edges, threshold: EDGE_THRESHOLD };
}

function scorePair(
  aId: string,
  bId: string,
  a: ResidentProfile,
  b: ResidentProfile,
  highRiskIds?: Set<string>
): GraphEdge {
  const zero: MatchComponents = {
    interests: 0,
    socialPreferences: 0,
    careCompatibility: 0,
    schedule: 0,
    personality: 0,
    complementaryTraits: 0,
  };

  if (highRiskIds?.has(aId) && highRiskIds?.has(bId)) {
    return {
      a: aId,
      b: bId,
      score: 0,
      components: zero,
      blockedBy: "Both at elevated isolation risk",
    };
  }

  const blocking = hardFilters(a, b);
  if (blocking.length > 0) {
    return { a: aId, b: bId, score: 0, components: zero, blockedBy: blocking[0] };
  }

  const result = scoreMatch(a, b);
  return { a: aId, b: bId, score: result.score, components: result.components };
}
