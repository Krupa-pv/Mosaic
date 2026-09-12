"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Moon,
  Sun,
  TrendingUp,
} from "lucide-react";
import { allResidents, findResident } from "@/lib/roster";
import { attendeesFor, dayNameOf, eventsOn } from "@/lib/schedule";
import {
  OUTCOME_LABELS,
  recordOutcome,
  useAllAccepted,
  useOutcomes,
  type Outcome,
} from "@/lib/accepted";
import { events } from "@shared/seed";
import Avatar from "./ui/Avatar";
import AvatarStack from "./ui/AvatarStack";
import PageContainer from "./ui/PageContainer";
import RiskBadge from "./ui/RiskBadge";

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
                  <p className="text-caption text-muted">Room {r.roomNumber}</p>
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
                Review &amp; pair
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

/* ---------------- evening ---------------- */

function Evening({ today }: { today: string }) {
  const accepted = useAllAccepted();
  const outcomes = useOutcomes();

  // Only prescriptions for activities that actually ran today.
  const todayIds = new Set(eventsOn(today).map((e) => e.id));
  const due = accepted.filter((a) => todayIds.has(a.eventId));

  const outcomeOf = (eventId: string, residentId: string) =>
    outcomes.find((o) => o.eventId === eventId && o.residentId === residentId)
      ?.outcome;

  if (due.length === 0) {
    return (
      <Section icon={Moon} title="Nothing to log yet">
        <div className="rounded-2xl border border-dashed border-line bg-surface p-7">
          <p className="max-w-prose text-body leading-relaxed text-ink-soft">
            Nothing was scheduled for today. Once you accept a pairing, it shows
            up here at the end of the day for a one-tap outcome — and that
            result feeds back into future matches.
          </p>
          <Link
            href="/residents"
            className="mt-4 inline-flex items-center gap-1.5 text-caption font-medium text-accent hover:underline"
          >
            Find someone to pair
            <ArrowRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <Section icon={Moon} title="How did today go?" hint={`${due.length} to log`}>
      <ul className="space-y-3">
        {due.map((a) => {
          const r = findResident(a.residentId);
          const e = events.find((x) => x.id === a.eventId);
          if (!r || !e) return null;
          const current = outcomeOf(a.eventId, a.residentId);

          return (
            <li
              key={`${a.eventId}-${a.residentId}`}
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
                    {e.title} · {e.startTime}
                  </p>
                </div>
                <RiskBadge level={r.riskLevel} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((o) => {
                  const active = current === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={active}
                      onClick={() => recordOutcome(a.eventId, a.residentId, o)}
                      className={`rounded-lg px-3.5 py-2 text-caption transition ${
                        active
                          ? o === "went_well"
                            ? "bg-low text-white"
                            : o === "follow_up"
                              ? "bg-mid text-white"
                              : "bg-muted text-white"
                          : "bg-surface text-ink-soft ring-1 ring-inset ring-line hover:bg-line-soft"
                      }`}
                    >
                      {OUTCOME_LABELS[o]}
                    </button>
                  );
                })}
              </div>

              {current === "went_well" && (
                <p className="kw-fade mt-3 text-caption text-low">
                  Logged. Mosaic will weight this pairing higher for both of them.
                </p>
              )}
              {current === "follow_up" && (
                <p className="kw-fade mt-3 text-caption text-mid">
                  Flagged for tomorrow&apos;s rounds.
                </p>
              )}
              {current === "did_not_happen" && (
                <p className="kw-fade mt-3 text-caption text-muted">
                  Noted — this won&apos;t count against the pairing.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ---------------- shared ---------------- */

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-2.5 border-b border-line pb-2.5">
        <Icon aria-hidden className="h-4 w-4 translate-y-0.5 text-accent" strokeWidth={1.75} />
        <h2 className="text-body font-medium text-ink">{title}</h2>
        {hint && <span className="text-micro text-faint">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
