"use client";

import { useState } from "react";
import type { FloorGraph } from "../../../lib/graph";
import { allResidents, findResident } from "@/lib/roster";
import { initials } from "@/lib/ui";

/**
 * Every pair, exactly. Residents are ordered by risk, so the ones Mosaic
 * is watching cluster at the top-left — where you can see at a glance
 * how few strong options they have.
 */
export default function CompatibilityMatrix({
  graph,
  onSelect,
}: {
  graph: FloorGraph;
  onSelect: (residentId: string) => void;
}) {
  const [focus, setFocus] = useState<{ a: string; b: string } | null>(null);

  const ordered = [...allResidents].sort((a, b) => b.riskScore - a.riskScore);

  const edge = (a: string, b: string) =>
    graph.edges.find(
      (e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)
    );

  const focused = focus ? edge(focus.a, focus.b) : null;

  return (
    <div className="rounded-2xl border border-line bg-raised p-5">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-micro">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-raised" />
              {ordered.map((r) => (
                <th key={r.id} className="p-1 align-bottom">
                  <span className="block w-7 text-center font-medium text-muted">
                    {initials(r.firstName, r.lastName)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr key={row.id}>
                <th className="sticky left-0 z-10 bg-raised pr-3 text-right font-normal whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    className="text-caption text-ink-soft transition hover:text-accent"
                  >
                    {row.firstName} {row.lastName[0]}.
                  </button>
                </th>
                {ordered.map((col) => {
                  if (row.id === col.id) {
                    return (
                      <td key={col.id} className="p-0">
                        <div className="h-7 w-7 rounded bg-line-soft" />
                      </td>
                    );
                  }
                  const e = edge(row.id, col.id);
                  const blocked = Boolean(e?.blockedBy);
                  const score = e?.score ?? 0;
                  const active =
                    focus &&
                    ((focus.a === row.id && focus.b === col.id) ||
                      (focus.a === col.id && focus.b === row.id));

                  return (
                    <td key={col.id} className="p-0">
                      <button
                        type="button"
                        onMouseEnter={() => setFocus({ a: row.id, b: col.id })}
                        onFocus={() => setFocus({ a: row.id, b: col.id })}
                        className={`grid h-7 w-7 place-items-center rounded text-[9.5px] font-medium tabular-nums transition ${
                          active ? "ring-2 ring-accent" : ""
                        } ${
                          blocked
                            ? "bg-high-soft text-high"
                            : score >= 85
                              ? "bg-accent text-white"
                              : score >= 70
                                ? "bg-accent/55 text-white"
                                : score >= 55
                                  ? "bg-accent/25 text-accent-deep"
                                  : "bg-line-soft text-muted"
                        }`}
                        aria-label={`${row.firstName} and ${col.firstName}: ${
                          blocked ? e?.blockedBy : score
                        }`}
                      >
                        {blocked ? "✕" : score}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Detail for the focused pair ---- */}
      <div className="mt-4 min-h-[68px] border-t border-line-soft pt-4">
        {focused && focus ? (
          <div className="kw-fade">
            <p className="text-body text-ink">
              {findResident(focus.a)?.firstName} &amp;{" "}
              {findResident(focus.b)?.firstName}
              {focused.blockedBy ? (
                <span className="ml-2 text-caption text-high">
                  ruled out — {focused.blockedBy.toLowerCase()}
                </span>
              ) : (
                <span className="ml-2 font-mono text-caption text-accent">
                  {focused.score}
                </span>
              )}
            </p>
            {!focused.blockedBy && (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {Object.entries(focused.components).map(([k, v]) => (
                  <span key={k} className="text-micro text-muted">
                    {label(k)} <span className="font-mono text-ink-soft">{v}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-caption text-faint">
            Hover any cell for the score breakdown. ✕ means a hard filter
            ruled the pair out.
          </p>
        )}
      </div>
    </div>
  );
}

function label(k: string) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
