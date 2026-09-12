"use client";

import { allResidents } from "./roster";
import { attendeesFor } from "./schedule";
import { events } from "@shared/seed";

// ============================================================
// Who has actually spent time together, recently.
//
// Different question from compatibility. The graph used to show who
// *could* get on; this shows who *has* — and so the residents floating
// at the edge are the ones genuinely not seeing anyone, rather than the
// ones the scorer happens to rate poorly.
//
// Co-attendance over the last seven days: two residents on the same
// activity were in the same room at the same time.
// ============================================================

export const WINDOW_DAYS = 7;

export interface Connection {
  a: string;
  b: string;
  /** Times they were in the same room this week. */
  times: number;
  /** The activities they shared. */
  via: string[];
}

export interface ConnectionGraph {
  connections: Connection[];
  /** Total shared sessions per resident, this window. */
  contact: Record<string, number>;
  isolated: string[];
  windowDays: number;
}

/** How many times this event runs in a seven-day window. */
function weeklyOccurrences(startTime: string): number {
  return startTime.split(" ")[0] === "Daily" ? WINDOW_DAYS : 1;
}

export function buildConnections(): ConnectionGraph {
  const pairs = new Map<string, Connection>();
  const contact: Record<string, number> = {};
  for (const r of allResidents) contact[r.id] = 0;

  for (const event of events) {
    const going = attendeesFor(event.id)
      .filter((a) => !a.lapsed)
      .map((a) => a.residentId);
    const runs = weeklyOccurrences(event.startTime);

    for (const id of going) contact[id] = (contact[id] ?? 0) + runs;

    for (let i = 0; i < going.length; i++) {
      for (let j = i + 1; j < going.length; j++) {
        const [a, b] = [going[i], going[j]].sort();
        const key = `${a}|${b}`;
        const existing = pairs.get(key);
        pairs.set(key, {
          a,
          b,
          times: (existing?.times ?? 0) + runs,
          via: [...(existing?.via ?? []), event.title],
        });
      }
    }
  }

  const connections = [...pairs.values()].sort((x, y) => y.times - x.times);

  // Nobody to speak of: no shared sessions at all, or only the one.
  const isolated = allResidents
    .map((r) => r.id)
    .filter((id) => (contact[id] ?? 0) <= 1)
    .sort((a, b) => (contact[a] ?? 0) - (contact[b] ?? 0));

  return { connections, contact, isolated, windowDays: WINDOW_DAYS };
}

/** Distinct people someone shared a room with this window. */
export function companionsOf(
  graph: ConnectionGraph,
  residentId: string
): { residentId: string; times: number }[] {
  return graph.connections
    .filter((c) => c.a === residentId || c.b === residentId)
    .map((c) => ({
      residentId: c.a === residentId ? c.b : c.a,
      times: c.times,
    }))
    .sort((x, y) => y.times - x.times);
}
