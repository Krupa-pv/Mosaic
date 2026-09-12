"use client";

import type { MatchCandidate } from "@/lib/api";
import { findResident } from "@/lib/roster";
import { initials } from "@/lib/ui";

/**
 * The scoring pass, made visible. Shows that the recommended pairing was
 * picked out of a scored field — including who got hard-filtered and why.
 */
export default function CandidateList({
  candidates,
  selectedId,
  onChoose,
}: {
  candidates: MatchCandidate[];
  selectedId: string;
  /** Staff override — pair with this candidate instead of the top scorer. */
  onChoose?: (residentId: string) => void;
}) {
  const considered = candidates.filter((c) => !c.filtered);
  const filtered = candidates.filter((c) => c.filtered);

  return (
    <div className="kw-rise mt-5 overflow-hidden rounded-2xl border border-line bg-raised">
      <div className="flex items-baseline gap-2.5 border-b border-line-soft px-6 py-3.5">
        <h3 className="eyebrow">Candidates scored</h3>
        <span className="text-[11px] text-faint">
          {considered.length} eligible
          {filtered.length > 0 && ` · ${filtered.length} filtered out`}
        </span>
      </div>

      <ul className="divide-y divide-line-soft">
        {considered.map((c) => {
          const r = findResident(c.residentId);
          const best = c.residentId === selectedId;
          return (
            <li
              key={c.residentId}
              className={`flex items-center gap-4 px-6 py-3.5 ${
                best ? "bg-accent-soft/40" : ""
              }`}
            >
              <span
                aria-hidden
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold ${
                  best
                    ? "bg-accent text-white"
                    : "bg-line-soft text-ink-soft"
                }`}
              >
                {r ? initials(r.firstName, r.lastName) : "?"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-[13.5px] ${
                      best ? "font-medium text-accent-deep" : "text-ink"
                    }`}
                  >
                    {r ? `${r.firstName} ${r.lastName}` : c.residentId}
                  </span>
                  {best && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white uppercase">
                      Best match
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                  {c.note}
                </p>
              </div>

              {/* Staff know things the scorer doesn't — let them override. */}
              {onChoose && !best && (
                <button
                  type="button"
                  onClick={() => onChoose(c.residentId)}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-micro font-medium text-accent transition hover:bg-accent-soft"
                >
                  Pair instead
                </button>
              )}

              <div className="w-16 shrink-0">
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${
                      best ? "bg-accent" : "bg-faint"
                    }`}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
              </div>

              <span
                className={`w-7 shrink-0 text-right font-mono text-[13px] tabular-nums ${
                  best ? "text-accent-deep" : "text-muted"
                }`}
              >
                {c.score}
              </span>
            </li>
          );
        })}

        {filtered.map((c) => {
          const r = findResident(c.residentId);
          return (
            <li
              key={c.residentId}
              className="flex items-center gap-4 bg-surface px-6 py-3.5"
            >
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-line-soft text-[10.5px] font-semibold text-faint"
              >
                {r ? initials(r.firstName, r.lastName) : "?"}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[13.5px] text-muted line-through decoration-faint">
                  {r ? `${r.firstName} ${r.lastName}` : c.residentId}
                </span>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                  {c.note}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-medium tracking-wide text-faint uppercase">
                Excluded
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
