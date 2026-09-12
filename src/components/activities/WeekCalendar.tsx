"use client";

import Link from "next/link";
import type { SocialEvent } from "@shared/types";
import { attendeesFor } from "@/lib/schedule";
import { findResident } from "@/lib/roster";
import AvatarStack from "../ui/AvatarStack";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function slot(startTime: string) {
  const [day, ...rest] = startTime.split(" ");
  return { day, time: rest.join(" ") };
}

function minutes(time: string) {
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

/** The week as a grid, with standing daily events drawn on every day. */
export default function WeekCalendar({ events }: { events: SocialEvent[] }) {
  const onDay = (day: string) =>
    events
      .filter((e) => {
        const d = slot(e.startTime).day;
        return d === day || d === "Daily";
      })
      .sort(
        (a, b) => minutes(slot(a.startTime).time) - minutes(slot(b.startTime).time)
      );

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[900px] grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const list = onDay(day);
          return (
            <div key={day} className="flex flex-col">
              <div className="flex items-center gap-1.5 rounded-lg bg-accent-deep px-3 py-2 text-white">
                <span className="text-micro font-semibold tracking-wide uppercase">
                  {day.slice(0, 3)}
                </span>
                <span className="ml-auto text-micro text-white/70">
                  {list.length}
                </span>
              </div>

              <div className="mt-2 flex flex-1 flex-col gap-2">
                {list.map((e) => {
                  const going = attendeesFor(e.id).filter((a) => !a.lapsed);
                  const watched = going.filter(
                    (a) => findResident(a.residentId)?.riskLevel !== "low"
                  ).length;
                  const standing = slot(e.startTime).day === "Daily";

                  return (
                    <Link
                      key={e.id}
                      href={`/activities/${e.id}`}
                      className={`group rounded-xl border p-3 transition hover:border-accent/40 ${
                        standing
                          ? "border-line-soft bg-surface"
                          : "border-line bg-raised"
                      }`}
                    >
                      <span className="block font-mono text-micro tabular-nums text-muted">
                        {slot(e.startTime).time}
                      </span>
                      <span className="mt-1 block text-caption leading-snug text-ink transition group-hover:text-accent-deep">
                        {e.title}
                      </span>
                      <span className="mt-2 flex items-center gap-1.5">
                        <AvatarStack
                          residentIds={going.map((a) => a.residentId)}
                          max={3}
                          ring="raised"
                        />
                        <span className="text-micro text-muted">
                          {going.length}
                        </span>
                      </span>
                      {watched > 0 && (
                        <span className="mt-1.5 block text-micro text-mid">
                          {watched} watched
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
