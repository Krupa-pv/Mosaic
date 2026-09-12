"use client";

import Link from "next/link";
import type { SocialEvent } from "@shared/types";
import { attendeesFor } from "@/lib/schedule";
import { findResident } from "@/lib/roster";
import Avatar from "./ui/Avatar";

// The shift, not the day. Everything is positioned against these hours
// so a caregiver sees their own working window, with gaps as gaps.
const START = 8; // 8am
const END = 17; // 5pm
const PX_PER_HOUR = 96;
const CARD_H = 62; // Enough for a title plus a line of detail.

function minutesOf(startTime: string): number | null {
  const m = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}

function label(h: number) {
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${suffix}`;
}

/**
 * Today, laid out against the shift.
 *
 * Each event is marked with whether it's one this caregiver is running
 * and which of *their* residents are on it — a roster of eight means
 * nothing if only two of them are yours.
 */
export default function DayCalendar({
  events,
  myResidentIds,
  now,
}: {
  events: SocialEvent[];
  myResidentIds: string[];
  now: Date;
}) {
  const mine = new Set(myResidentIds);
  const hours = Array.from({ length: END - START + 1 }, (_, i) => START + i);
  const height = (END - START) * PX_PER_HOUR;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = ((nowMinutes - START * 60) / 60) * PX_PER_HOUR;
  const nowVisible = nowMinutes >= START * 60 && nowMinutes <= END * 60;

  // Two activities half an hour apart used to sit on top of each other,
  // because a card is taller than 30 minutes of track. Anything that
  // collides is laid out side by side instead of stacked.
  const sorted = events
    .map((e) => ({ event: e, at: minutesOf(e.startTime) }))
    .filter((x): x is { event: SocialEvent; at: number } => x.at !== null)
    .sort((a, b) => a.at - b.at);

  const minutesPerCard = (CARD_H / PX_PER_HOUR) * 60;
  type Placed = { event: SocialEvent; at: number; col: number; cols: number };
  const placed: Placed[] = [];
  let cluster: Placed[] = [];

  const closeCluster = () => {
    for (const item of cluster) item.cols = cluster.length;
    placed.push(...cluster);
    cluster = [];
  };

  for (const item of sorted) {
    const overlaps =
      cluster.length > 0 &&
      item.at - cluster[cluster.length - 1].at < minutesPerCard;
    if (!overlaps) closeCluster();
    cluster.push({ ...item, col: cluster.length, cols: 1 });
  }
  closeCluster();

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-raised p-5">
      <div className="relative" style={{ height }}>
        {/* ---- Hour rules ---- */}
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute right-0 left-0 flex items-start gap-3"
            style={{ top: i * PX_PER_HOUR }}
          >
            <span className="w-14 shrink-0 -translate-y-2 text-right font-mono text-micro tabular-nums text-faint">
              {label(h)}
            </span>
            <span className="mt-[1px] h-px flex-1 bg-line-soft" />
          </div>
        ))}

        {/* ---- Now ---- */}
        {nowVisible && (
          <div
            className="absolute right-0 left-14 z-10 flex items-center gap-2"
            style={{ top: nowOffset }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-high" />
            <span className="h-px flex-1 bg-high/50" />
            <span className="text-micro font-medium text-high">now</span>
          </div>
        )}

        {/* ---- Events ---- */}
        <div className="absolute inset-y-0 left-[68px] right-0">
          {placed.map(({ event, at, col, cols }) => {
            const top = ((at - START * 60) / 60) * PX_PER_HOUR;
            if (top < -20 || top > height) return null;
            const width = `calc((100% - ${(cols - 1) * 8}px) / ${cols})`;
            const left = `calc((100% - ${(cols - 1) * 8}px) / ${cols} * ${col} + ${col * 8}px)`;

            const going = attendeesFor(event.id).filter((a) => !a.lapsed);
            const yours = going.filter((a) => mine.has(a.residentId));

            return (
              <Link
                key={event.id}
                href={`/activities/${event.id}`}
                className={`absolute flex items-center gap-3 overflow-hidden rounded-xl border px-4 transition hover:border-accent hover:z-10 ${
                  yours.length > 0
                    ? "border-accent/45 bg-accent-soft/60"
                    : "border-line-soft bg-surface"
                }`}
                style={{ top, left, width, height: CARD_H - 6 }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-ink">
                    {event.title}
                  </span>
                  <span className="block truncate text-micro text-muted">
                    {event.startTime.split(" ").slice(1).join(" ")} ·{" "}
                    {event.location} · {going.length} attending
                  </span>
                </span>

                {yours.length > 0 ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="flex -space-x-2">
                      {yours.map((a) => {
                        const r = findResident(a.residentId);
                        return r ? (
                          <Avatar
                            key={a.residentId}
                            residentId={a.residentId}
                            firstName={r.firstName}
                            lastName={r.lastName}
                            size="xs"
                            ring="raised"
                            letters="first"
                          />
                        ) : null;
                      })}
                    </span>
                    <span className="text-micro font-medium text-accent-deep">
                      {yours.length === 1
                        ? findResident(yours[0].residentId)?.firstName
                        : `${yours.length} of yours`}
                    </span>
                  </span>
                ) : (
                  <span className="text-micro text-faint">none of yours</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
