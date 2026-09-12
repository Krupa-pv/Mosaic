"use client";

import type { Resident } from "@shared/types";
import { lapsedCount, weekFor, type ScheduleEntry } from "@/lib/schedule";
import { initials } from "@/lib/ui";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** "Wednesday 10:00 AM" -> { day: "Wednesday", time: "10:00 AM" } */
function parseSlot(startTime: string) {
  const [day, ...rest] = startTime.split(" ");
  return { day, time: rest.join(" ") };
}

/** Sort chips within a day by clock time. */
function minutes(time: string) {
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

/**
 * Two weeks side by side, so accepting a recommendation visibly lands
 * somewhere. Margaret's empty days are the point — don't pad them.
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
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <Calendar resident={a} eventId={eventId} />
      <Calendar resident={b} eventId={eventId} />
    </div>
  );
}

function Calendar({ resident, eventId }: { resident: Resident; eventId: string }) {
  const week = weekFor(resident.id, eventId);
  const gained = week.some((e) => e.isNew);

  // A daily commitment belongs on every day, the way any calendar would
  // draw it. Keeping it in a separate band undercounted Helen — she has
  // something every single day, and that contrast is the whole point.
  const byDay = (day: string) =>
    week
      .filter((e) => {
        const d = parseSlot(e.event.startTime).day;
        return d === day || d === "Daily";
      })
      .sort(
        (x, y) =>
          minutes(parseSlot(x.event.startTime).time) -
          minutes(parseSlot(y.event.startTime).time)
      );

  const scheduledDays = DAYS.filter((d) =>
    byDay(d).some((e) => !e.lapsed)
  ).length;
  const dropped = lapsedCount(resident.id);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-raised">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-2.5 border-b border-line-soft px-5 py-3.5">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-line-soft text-[10px] font-semibold text-ink-soft"
        >
          {initials(resident.firstName, resident.lastName)}
        </span>
        <span className="text-[13px] font-medium text-ink">
          {resident.firstName}&apos;s week
        </span>
        <span className="ml-auto text-[11px] text-muted">
          {scheduledDays} of 7 days
          {gained && <span className="ml-1.5 text-accent">+1</span>}
        </span>
      </div>

      {dropped > 0 && (
        <p className="border-b border-line-soft bg-high-soft/40 px-5 py-2 text-[11px] text-high">
          {dropped} activit{dropped === 1 ? "y" : "ies"} dropped in the last
          three weeks — shown struck through
        </p>
      )}

      {/* ---- Week grid ---- */}
      <div className="divide-y divide-line-soft">
        {DAYS.map((day) => {
          const items = byDay(day);
          return (
            <div key={day} className="flex min-h-[42px] items-stretch">
              <div
                className={`w-[52px] shrink-0 border-r border-line-soft px-3 py-2.5 text-[10.5px] font-medium tracking-wide uppercase ${
                  items.length ? "text-ink-soft" : "text-faint"
                }`}
              >
                {day.slice(0, 3)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
                {items.length === 0 ? (
                  <span aria-label="Nothing scheduled" className="text-[13px] leading-none text-line">
                    —
                  </span>
                ) : (
                  items.map((e) => <Chip key={e.event.id} entry={e} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ entry }: { entry: ScheduleEntry }) {
  const { event, isNew, wasAlready, lapsed } = entry;
  const highlight = isNew || wasAlready;
  // Standing daily commitments sit back so one-off events read first.
  const standing = parseSlot(event.startTime).day === "Daily";

  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-2 rounded-md px-2 py-1 ${
        isNew
          ? "kw-rise bg-accent text-white"
          : wasAlready
            ? "bg-accent-soft text-accent-deep ring-1 ring-inset ring-accent/25"
            : lapsed
              ? "text-faint"
              : standing
                ? "bg-surface/60 text-muted"
                : "bg-surface text-ink-soft ring-1 ring-inset ring-line-soft"
      }`}
    >
      <span
        className={`text-[11.5px] leading-tight ${highlight ? "font-medium" : ""} ${
          lapsed ? "line-through decoration-faint" : ""
        }`}
      >
        {event.title}
      </span>
      <span className={`text-[10px] ${isNew ? "text-white/75" : "text-muted"}`}>
        {lapsed ? "stopped attending" : parseSlot(event.startTime).time}
      </span>
      {isNew && (
        <span className="rounded-full bg-white/20 px-1.5 text-[9px] font-medium tracking-wide uppercase">
          Added
        </span>
      )}
      {wasAlready && (
        <span className="text-[9px] font-medium tracking-wide text-accent uppercase">
          Already going
        </span>
      )}
    </div>
  );
}
