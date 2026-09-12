"use client";

import Link from "next/link";
import { useAccepted } from "@/lib/accepted";
import { attendeesFor } from "@/lib/schedule";
import { findResident } from "@/lib/roster";
import { initials, riskTone } from "@/lib/ui";

/**
 * Who is on this activity's roster — including anyone added by a
 * prescription accepted earlier in the session, and anyone who used to
 * come and stopped.
 */
export default function AttendeeList({ eventId }: { eventId: string }) {
  const justAdded = useAccepted(eventId);
  const base = attendeesFor(eventId);

  const rows = [
    ...base.map((a) => ({ ...a, isNew: false })),
    ...justAdded
      .filter((id) => !base.some((a) => a.residentId === id && !a.lapsed))
      .map((residentId) => ({ residentId, lapsed: false, isNew: true })),
  ];

  const going = rows.filter((r) => !r.lapsed);
  const stopped = rows.filter((r) => r.lapsed);
  const watching = going.filter(
    (r) => findResident(r.residentId)?.riskLevel !== "low"
  ).length;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2.5">
        <h2 className="eyebrow">
          Attending · {going.length}
        </h2>
        {watching > 0 && (
          <span className="text-[11px] text-muted">
            {watching} {watching === 1 ? "resident" : "residents"} Mosaic is
            watching
          </span>
        )}
      </div>

      <ul>
        {going.map((r) => (
          <Row key={r.residentId} residentId={r.residentId} isNew={r.isNew} />
        ))}
        {going.length === 0 && (
          <li className="py-6 text-[13px] text-muted">
            Nobody is signed up for this activity yet.
          </li>
        )}
      </ul>

      {stopped.length > 0 && (
        <>
          <div className="mt-8 border-b border-line pb-2.5">
            <h2 className="eyebrow">Stopped attending · {stopped.length}</h2>
          </div>
          <ul>
            {stopped.map((r) => (
              <Row key={r.residentId} residentId={r.residentId} lapsed />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Row({
  residentId,
  isNew = false,
  lapsed = false,
}: {
  residentId: string;
  isNew?: boolean;
  lapsed?: boolean;
}) {
  const r = findResident(residentId);
  if (!r) return null;
  const tone = riskTone(r.riskLevel);

  return (
    <li className="border-b border-line-soft">
      <Link
        href={`/residents/${r.id}`}
        className={`group flex items-center gap-4 py-3.5 ${
          isNew ? "kw-rise" : ""
        }`}
      >
        <span
          aria-hidden
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold transition ${
            isNew
              ? "bg-accent text-white"
              : "bg-line-soft text-ink-soft group-hover:bg-accent-soft group-hover:text-accent-deep"
          }`}
        >
          {initials(r.firstName, r.lastName)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span
              className={`text-[14.5px] transition group-hover:text-accent-deep ${
                lapsed
                  ? "text-muted line-through decoration-faint"
                  : "text-ink"
              }`}
            >
              {r.firstName} {r.lastName}
            </span>
            {isNew && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white uppercase">
                Just added
              </span>
            )}
          </span>
          <span className="block text-[11.5px] text-muted">
            Room {r.roomNumber}
          </span>
        </span>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10.5px] font-medium ${tone.badge}`}
        >
          {tone.label}
        </span>
      </Link>
    </li>
  );
}
