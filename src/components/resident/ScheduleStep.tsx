"use client";

import { findResident } from "@/lib/roster";
import { useFlowActions, useFlowResults } from "./ResidentFlowProvider";
import PairSchedule from "../PairSchedule";
import EmptyStep from "./EmptyStep";
import Tag from "../ui/Tag";

/** The commitment beat: both weeks side by side, then accept or decline. */
export default function ScheduleStep() {
  const r = useFlowResults();
  const a = useFlowActions();

  if (!r.match || !r.prescription) {
    return (
      <EmptyStep
        title="No pairing yet"
        body={`Once Mosaic has matched ${r.residentName} with a companion and found an activity that suits them both, their weeks appear here side by side.`}
        href={`/residents/${r.residentId}/pair`}
        cta="Find a companion"
      />
    );
  }

  const a1 = findResident(r.match.residentAId);
  const b1 = findResident(r.match.residentBId);
  const { event, status } = r.prescription;

  return (
    <>
      <header>
        <h2 className="display text-title leading-tight text-ink">
          When they&apos;re free
        </h2>
        <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
          {event.title}, {event.startTime} — against both residents&apos; weeks.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Tag tone="accent">{event.title}</Tag>
        <Tag>{event.startTime}</Tag>
        <Tag>{event.location}</Tag>
      </div>

      {a1 && b1 && <PairSchedule a={a1} b={b1} eventId={event.id} />}

      {status === "suggested" ? (
        <div className="mt-7 flex gap-2.5">
          <button
            type="button"
            onClick={() => a.settle("accepted")}
            className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-body font-medium text-white transition hover:bg-accent-deep"
          >
            Accept &amp; schedule
          </button>
          <button
            type="button"
            onClick={() => a.settle("declined")}
            className="rounded-xl border border-line px-5 py-3.5 text-body text-ink-soft transition hover:bg-surface"
          >
            Decline
          </button>
        </div>
      ) : (
        <div
          className={`kw-rise mt-7 rounded-xl px-5 py-4 text-caption leading-relaxed ${
            status === "accepted"
              ? "bg-accent-soft text-accent-deep"
              : "bg-surface text-muted"
          }`}
        >
          {status === "accepted" ? (
            <>
              <strong className="font-semibold">Scheduled.</strong> Both
              residents are on the {event.title} roster. You&apos;ll be asked
              how it went on tonight&apos;s end-of-day screen — that result
              feeds back into future matches.
            </>
          ) : (
            <>Declined. Mosaic will suggest a different pairing.</>
          )}
        </div>
      )}
    </>
  );
}
