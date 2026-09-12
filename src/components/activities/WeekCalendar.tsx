"use client";

import Link from "next/link";
import type { SocialEvent } from "@shared/types";
import { attendeesFor } from "@/lib/schedule";
import { findResident } from "@/lib/roster";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const START = 8;
const END = 17;
// Tall enough, and cards short enough, that two events 30 minutes
// apart stack rather than splitting the day into unreadable columns.
const PX_PER_HOUR = 104;
const CARD_H = 46;

function slot(startTime: string) {
  const [day, ...rest] = startTime.split(" ");
  return { day, time: rest.join(" ") };
}

function minutesOf(time: string): number | null {
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function hourLabel(h: number) {
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

/**
 * The week on a clock, the same way the shift view draws today — so
 * "when is there a gap on Thursday afternoon" is answerable by looking.
 * The previous version was a list per column, which showed what runs but
 * not when.
 */
export default function WeekCalendar({ events }: { events: SocialEvent[] }) {
  const hours = Array.from({ length: END - START + 1 }, (_, i) => START + i);
  const height = (END - START) * PX_PER_HOUR;

  const onDay = (day: string) =>
    events
      .filter((e) => {
        const d = slot(e.startTime).day;
        return d === day || d === "Daily";
      })
      .map((e) => ({ event: e, at: minutesOf(slot(e.startTime).time) }))
      .filter((x): x is { event: SocialEvent; at: number } => x.at !== null)
      .sort((a, b) => a.at - b.at);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-raised p-5">
      <div className="min-w-[980px]">
        {/* ---- Day headers ---- */}
        <div className="flex gap-2 pl-14">
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex-1 rounded-lg bg-accent-deep px-3 py-2 text-white"
            >
              <span className="text-micro font-semibold tracking-wide uppercase">
                {day.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>

        <div className="relative mt-3" style={{ height }}>
          {/* ---- Hour rules ---- */}
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute right-0 left-0 flex items-start gap-3"
              style={{ top: i * PX_PER_HOUR }}
            >
              <span className="w-11 shrink-0 -translate-y-2 text-right font-mono text-micro tabular-nums text-faint">
                {hourLabel(h)}
              </span>
              <span className="mt-[1px] h-px flex-1 bg-line-soft" />
            </div>
          ))}

          {/* ---- Day separators ---- */}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-14 flex gap-2">
            {DAYS.map((day, i) => (
              <div key={day} className="relative flex-1">
                {i > 0 && (
                  <span className="absolute inset-y-0 -left-1 w-px bg-line" />
                )}
              </div>
            ))}
          </div>

          {/* ---- Columns ---- */}
          <div className="absolute inset-y-0 right-0 left-14 flex gap-2">
            {DAYS.map((day) => {
              const items = onDay(day);
              const minutesPerCard = (CARD_H / PX_PER_HOUR) * 60;

              // Side by side when two sit too close to stack.
              const cols: number[] = [];
              const placed = items.map((item, i) => {
                const prev = items[i - 1];
                const clash = prev && item.at - prev.at < minutesPerCard;
                const col = clash ? (cols[i - 1] ?? 0) + 1 : 0;
                cols[i] = col;
                return { ...item, col };
              });
              const maxCol = Math.max(0, ...cols) + 1;

              return (
                <div key={day} className="relative flex-1">
                  {placed.map(({ event, at, col }) => {
                    const top = ((at - START * 60) / 60) * PX_PER_HOUR;
                    if (top < -20 || top > height) return null;

                    const going = attendeesFor(event.id).filter((a) => !a.lapsed);
                    const watched = going.filter(
                      (a) => findResident(a.residentId)?.riskLevel !== "low"
                    ).length;
                    const standing = slot(event.startTime).day === "Daily";

                    return (
                      <Link
                        key={event.id}
                        href={`/activities/${event.id}`}
                        className={`absolute overflow-hidden rounded-lg border px-2.5 py-1 transition hover:z-10 hover:border-accent ${
                          standing
                            ? "border-line-soft bg-surface"
                            : "border-accent/35 bg-accent-soft/50"
                        }`}
                        style={{
                          top,
                          height: CARD_H - 6,
                          left: `${(col / maxCol) * 100}%`,
                          width: `${(1 / maxCol) * 100}%`,
                        }}
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="font-mono text-micro tabular-nums text-muted">
                            {slot(event.startTime).time.replace(":00", "")}
                          </span>
                          <span
                            className={`ml-auto text-micro ${
                              watched > 0 ? "text-mid" : "text-muted"
                            }`}
                          >
                            {going.length}
                            {watched > 0 && `·${watched}`}
                          </span>
                        </span>
                        <span className="block truncate text-caption leading-tight text-ink">
                          {event.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
