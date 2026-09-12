"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  ClipboardList,
  Moon,
  Sun,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { allResidents, findResident } from "@/lib/roster";
import { CURRENT_STAFF_ID, currentStaff, residentsOf, staffFor } from "@/lib/staff";
import { completeTask, useTasks } from "@/lib/tasks";
import { addObservation } from "@/lib/observations";
import { attendeesFor, dayNameOf, eventsOn } from "@/lib/schedule";
import { useAllAccepted } from "@/lib/accepted";
import { events } from "@shared/seed";
import Avatar from "./ui/Avatar";
import AvatarStack from "./ui/AvatarStack";
import PageContainer from "./ui/PageContainer";
import OutcomeCapture from "./OutcomeCapture";
import RiskBadge from "./ui/RiskBadge";
import SectionHeader from "./ui/SectionHeader";

type Mode = "morning" | "evening";

/**
 * The caregiver's home. Morning is "what do I need to know before
 * rounds"; evening is "what happened, and what needs following up".
 * Mode auto-selects on the clock and can be switched by hand.
 */
export default function TodayView({ staffName }: { staffName: string }) {
  const now = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<Mode>(now.getHours() < 15 ? "morning" : "evening");

  const today = dayNameOf(now);
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <PageContainer>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="eyebrow">{dateLabel} · Floor 2</p>
          <h1 className="display mt-2 text-headline text-ink">
            {mode === "morning"
              ? `Good morning, ${staffName}`
              : `Evening, ${staffName}`}
          </h1>
          <p className="mt-2 max-w-prose text-caption text-muted">
            {mode === "morning"
              ? "Three things to know before you start rounds."
              : "Log how today went — it sharpens tomorrow's suggestions."}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Time of day"
          className="inline-flex rounded-xl bg-raised p-1 ring-1 ring-inset ring-line"
        >
          {(["morning", "evening"] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-caption transition ${
                mode === m
                  ? "bg-accent font-medium text-white"
                  : "text-ink-soft hover:bg-accent-soft"
              }`}
            >
              {m === "morning" ? (
                <Sun aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Moon aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              )}
              {m === "morning" ? "Before rounds" : "End of day"}
            </button>
          ))}
        </div>
      </header>

      {mode === "morning" ? (
        <Morning today={today} />
      ) : (
        <Evening today={today} />
      )}
    </PageContainer>
  );
}

/* ---------------- morning ---------------- */

function Morning({ today }: { today: string }) {
  // Rising fastest first — someone climbing steeply matters more than
  // someone merely high and stable.
  const needsAttention = [...allResidents]
    .filter((r) => r.riskLevel !== "low" && r.riskTrend > 0)
    .sort((a, b) => b.riskTrend * 2 + b.riskScore - (a.riskTrend * 2 + a.riskScore))
    .slice(0, 3);

  const todays = eventsOn(today);
  const onSomethingToday = new Set(
    todays.flatMap((e) => attendeesFor(e.id).filter((a) => !a.lapsed).map((a) => a.residentId))
  );
  const unscheduled = allResidents.filter(
    (r) => r.riskLevel !== "low" && !onSomethingToday.has(r.id)
  );

  return (
    <>
      <Section
        icon={CircleAlert}
        title="Needs attention"
        hint={`${needsAttention.length} residents`}
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {needsAttention.map((r) => (
            <Link
              key={r.id}
              href={`/residents/${r.id}`}
              className="group kw-rise flex flex-col rounded-2xl border border-line bg-raised p-5 transition hover:border-accent/40"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  residentId={r.id}
                  firstName={r.firstName}
                  lastName={r.lastName}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-ink">
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="text-caption text-muted">
                    Room {r.roomNumber}
                    {staffFor(r.id) && ` · ${staffFor(r.id)!.firstName}`}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2.5">
                <span className="display text-title tabular-nums text-ink">
                  {r.riskScore}
                </span>
                <span className="inline-flex items-center gap-1 text-caption font-medium text-high">
                  <TrendingUp aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                  {r.riskTrend} in 3 weeks
                </span>
              </div>

              <p className="mt-3 flex-1 text-caption leading-relaxed text-ink-soft">
                {r.riskFactors[0]}
              </p>

              <span className="mt-4 inline-flex items-center gap-1.5 text-caption font-medium text-accent">
                See what would help
                <ArrowRight
                  aria-hidden
                  className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </span>
            </Link>
          ))}
        </div>

        {unscheduled.length > 0 && (
          <p className="mt-4 rounded-xl bg-mid-soft px-4 py-3 text-caption leading-relaxed text-mid">
            <strong className="font-semibold">
              {unscheduled.length} watched{" "}
              {unscheduled.length === 1 ? "resident is" : "residents are"}
            </strong>{" "}
            on no activity roster today —{" "}
            {unscheduled.map((r) => r.firstName).join(", ")}.
          </p>
        )}
      </Section>

      <MyTasks />

      <Section
        icon={CalendarDays}
        title={`Today · ${today}`}
        hint={`${todays.length} activities`}
      >
        <ul className="overflow-hidden rounded-2xl border border-line bg-raised">
          {todays.map((e, i) => {
            const going = attendeesFor(e.id).filter((a) => !a.lapsed);
            return (
              <li key={e.id} className={i > 0 ? "border-t border-line-soft" : ""}>
                <Link
                  href={`/activities/${e.id}`}
                  className="group flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-surface"
                >
                  <span className="w-20 shrink-0 font-mono text-caption tabular-nums text-muted">
                    {e.startTime.split(" ").slice(1).join(" ")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-ink transition group-hover:text-accent-deep">
                      {e.title}
                    </span>
                    <span className="block text-caption text-muted">
                      {e.location}
                    </span>
                  </span>
                  <AvatarStack residentIds={going.map((a) => a.residentId)} ring="raised" />
                  <span className="w-8 text-right font-mono text-caption tabular-nums text-muted">
                    {going.length}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}

function MyTasks() {
  const open = useTasks({ staffId: CURRENT_STAFF_ID }).filter((t) => !t.doneAt);
  if (open.length === 0) return null;

  return (
    <Section
      icon={ClipboardList}
      title="Yours to do"
      hint={`${open.length} open`}
    >
      <ul className="space-y-2">
        {open.map((t) => {
          const r = findResident(t.residentId);
          return (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-raised px-5 py-3.5"
            >
              {r && (
                <Avatar
                  residentId={r.id}
                  firstName={r.firstName}
                  lastName={r.lastName}
                  size="xs"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink">
                  {t.title} — {r?.firstName}
                </p>
                <p className="text-micro text-muted">{t.because}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  completeTask(t.id);
                  addObservation({
                    residentId: t.residentId,
                    sentiment: "note",
                    text: `${t.title.toLowerCase()} — done.`,
                  });
                }}
                className="rounded-lg bg-accent px-3.5 py-2 text-caption font-medium text-white transition hover:bg-accent-deep"
              >
                Done
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ---------------- evening ---------------- */

function Evening({ today }: { today: string }) {
  const accepted = useAllAccepted();
  const me = currentStaff();

  // Everyone assigned to this caregiver gets a feedback row — not just
  // residents who happened to have a prescription today. End of shift is
  // when you have something to say about all of them, and the residents
  // who did nothing are exactly the ones worth hearing about.
  const mine = residentsOf(me.id)
    .map((id) => findResident(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => b.riskScore - a.riskScore);

  const todayIds = new Set(eventsOn(today).map((e) => e.id));
  const eventFor = (residentId: string) => {
    const hit = accepted.find(
      (a) => a.residentId === residentId && todayIds.has(a.eventId)
    );
    return hit ? events.find((e) => e.id === hit.eventId) : undefined;
  };

  return (
    <Section
      icon={Moon}
      title={`Your ${mine.length} residents`}
      hint="one line each is enough"
    >
      <ul className="space-y-3">
        {mine.map((r) => {
          const e = eventFor(r.id);
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-line bg-raised p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Avatar
                  residentId={r.id}
                  firstName={r.firstName}
                  lastName={r.lastName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-ink">
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="text-caption text-muted">
                    {e ? `${e.title} · ${e.startTime}` : "Nothing scheduled today"}
                  </p>
                </div>
                <Link
                  href={`/residents/${r.id}/history`}
                  className="text-caption text-muted transition hover:text-accent"
                >
                  History
                </Link>
                <RiskBadge level={r.riskLevel} />
              </div>

              <OutcomeCapture
                residentId={r.id}
                eventId={e?.id ?? "general"}
                scheduled={Boolean(e)}
              />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ---------------- shared ---------------- */

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <SectionHeader icon={icon} title={title} hint={hint} />
      <div className="mt-4">{children}</div>
    </section>
  );
}
