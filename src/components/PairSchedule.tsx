"use client";

import type { Resident } from "@shared/types";
import { weekFor, weeklyCount } from "@/lib/schedule";
import { initials } from "@/lib/ui";

/**
 * Shows the accepted activity landing on both residents' weeks.
 * Margaret's column is nearly empty and Helen's is full — that contrast
 * is the point, so don't "balance" it.
 */
export default function PairSchedule({
  a,
  b,
  eventId,
}: {
  a: Resident;
  b: Resident;
  eventId: string;
}) {
  return (
    <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
      <Column resident={a} eventId={eventId} />
      <Column resident={b} eventId={eventId} />
    </div>
  );
}

function Column({ resident, eventId }: { resident: Resident; eventId: string }) {
  const week = weekFor(resident.id, eventId);
  const before = weeklyCount(resident.id);
  const after = week.length;

  return (
    <div className="bg-raised p-5">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-line-soft text-[10px] font-semibold text-ink-soft"
        >
          {initials(resident.firstName, resident.lastName)}
        </span>
        <span className="text-[13px] font-medium text-ink">
          {resident.firstName}&apos;s week
        </span>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted">
          {after > before ? (
            <>
              <span className="text-faint line-through">{before}</span>{" "}
              <span className="text-accent">{after}</span>
            </>
          ) : (
            after
          )}
        </span>
      </div>

      <ul className="mt-3.5 space-y-1">
        {week.map(({ event, isNew, wasAlready }) => (
          <li
            key={event.id}
            className={`rounded-lg px-3 py-2 transition ${
              isNew
                ? "kw-rise bg-accent-soft"
                : wasAlready
                  ? "bg-accent-soft/40"
                  : ""
            }`}
          >
            <div className="flex items-baseline gap-2">
              <span
                className={`text-[12.5px] ${
                  isNew || wasAlready
                    ? "font-medium text-accent-deep"
                    : "text-ink-soft"
                }`}
              >
                {event.title}
              </span>
              {isNew && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white uppercase">
                  Added
                </span>
              )}
              {wasAlready && (
                <span className="text-[9.5px] font-medium tracking-wide text-accent uppercase">
                  Already attending
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {event.startTime} · {event.location}
            </div>
          </li>
        ))}
      </ul>

      {after === before && (
        <p className="mt-3 px-3 text-[11px] leading-relaxed text-muted">
          No change needed — {resident.firstName} is already there, which is
          what makes this an easy introduction.
        </p>
      )}
    </div>
  );
}
