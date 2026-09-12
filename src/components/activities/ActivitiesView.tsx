"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, List } from "lucide-react";
import type { SocialEvent } from "@shared/types";
import { attendeesFor } from "@/lib/schedule";
import { titleCase } from "@/lib/ui";
import AvatarStack from "../ui/AvatarStack";
import PageContainer from "../ui/PageContainer";
import Stat from "../ui/Stat";
import Tag from "../ui/Tag";
import WeekCalendar from "./WeekCalendar";

export default function ActivitiesView({ events }: { events: SocialEvent[] }) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const seated = events.filter((e) => e.accessibility.seatedAvailable).length;
  const small = events.filter((e) => e.groupSize === "small").length;

  return (
    <PageContainer width="wide">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">This week&apos;s programming</p>
          <h1 className="display mt-2 text-headline text-ink">
            Upcoming events
          </h1>
          <p className="mt-2 max-w-prose text-caption leading-relaxed text-muted">
            Every recommendation is drawn from this calendar. A pair is filtered
            against accessibility and group size first, then scored on shared
            interests and schedule — so an activity is only ever suggested to
            people who can actually attend it.
          </p>
        </div>
        <dl className="flex gap-8">
          <Stat label="Activities" value={events.length} />
          <Stat label="Seated" value={seated} />
          <Stat label="Small group" value={small} />
        </dl>
      </header>

      <div
        role="tablist"
        aria-label="View"
        className="mt-8 inline-flex rounded-xl bg-raised p-1 ring-1 ring-inset ring-line"
      >
        {(
          [
            ["calendar", "Week", CalendarDays],
            ["list", "List", List],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-caption transition ${
              view === key
                ? "bg-accent font-medium text-white"
                : "text-ink-soft hover:bg-accent-soft"
            }`}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "calendar" ? (
          <WeekCalendar events={events} />
        ) : (
          <ul>
            {events.map((e) => {
              const going = attendeesFor(e.id).filter((a) => !a.lapsed);
              return (
                <li key={e.id} className="border-b border-line-soft">
                  <Link
                    href={`/activities/${e.id}`}
                    className="group flex flex-wrap items-center gap-x-6 gap-y-3 py-5"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="display text-lead leading-tight text-ink transition group-hover:text-accent-deep">
                        {e.title}
                      </h3>
                      <p className="mt-1 text-caption text-muted">
                        {e.startTime} · {e.location}
                      </p>
                    </div>

                    <div className="hidden flex-wrap gap-1.5 lg:flex">
                      {e.interests.map((i) => (
                        <Tag key={i} tone="accent" size="sm">
                          {i}
                        </Tag>
                      ))}
                      <Tag size="sm">
                        {titleCase(e.groupSize.replace(/_/g, " "))} group
                      </Tag>
                    </div>

                    <div className="flex w-[136px] shrink-0 items-center justify-end gap-2.5">
                      <AvatarStack residentIds={going.map((a) => a.residentId)} />
                      <span className="font-mono text-caption tabular-nums text-muted">
                        {going.length}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
