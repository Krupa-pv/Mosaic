"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { WeekPlan, PlannedPairing } from "../../../lib/planner";
import { events } from "@shared/seed";
import { allResidents, findResident } from "@/lib/roster";
import { attendeesFor } from "@/lib/schedule";
import { recordAccepted, useAllAccepted } from "@/lib/accepted";
import Avatar from "../ui/Avatar";
import PageContainer from "../ui/PageContainer";
import RiskBadge from "../ui/RiskBadge";
import SectionHeader from "../ui/SectionHeader";
import Stat from "../ui/Stat";
import Tag from "../ui/Tag";
import RecentConnections from "../connections/RecentConnections";
import { buildConnections } from "@/lib/connections";
import { findInterestGaps } from "@/lib/gaps";

const DAYS = [
  "Daily",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * A week of prescriptions for the whole floor, generated from current
 * profiles and current attendance, prioritising residents who are
 * declining fastest.
 *
 * Every row is removable. A plan staff can't overrule is a plan they
 * won't trust — and they know things the scorer doesn't.
 */
export default function PlanView() {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const accepted = useAllAccepted();

  const priorities = useMemo(
    () =>
      allResidents
        .filter((r) => r.riskLevel !== "low")
        .map((r) => ({
          residentId: r.id,
          score: r.riskScore,
          trend: r.riskTrend,
        })),
    []
  );

  // Pure fetch, no state — so the mount effect below can await it
  // instead of calling setState synchronously in its body.
  const fetchPlan = useCallback(async (): Promise<WeekPlan> => {
    // Current rosters, so the plan doesn't re-suggest what already happens.
    const existing: Record<string, string[]> = {};
    for (const e of events) {
      existing[e.id] = attendeesFor(e.id)
        .filter((a) => !a.lapsed)
        .map((a) => a.residentId);
    }
    try {
      const res = await fetch("/api/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorities, existing }),
      });
      if (res.ok) return (await res.json()) as WeekPlan;
    } catch {
      /* fall through to the empty plan */
    }
    return { pairings: [], unplaced: [] };
  }, [priorities]);

  useEffect(() => {
    let cancelled = false;
    fetchPlan().then((p) => {
      if (cancelled) return;
      setPlan(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPlan]);

  async function generate() {
    setLoading(true);
    setDropped(new Set());
    setPlan(await fetchPlan());
    setLoading(false);
  }

  const kept = (plan?.pairings ?? []).filter((p) => !dropped.has(key(p)));
  const { isolated } = useMemo(() => buildConnections(accepted), [accepted]);
  const gaps = useMemo(() => findInterestGaps(), []);

  const byDay = DAYS.map((day) => ({
    day,
    rows: kept.filter((p) => p.startTime.split(" ")[0] === day),
  })).filter((d) => d.rows.length > 0);

  const isScheduled = (p: PlannedPairing) =>
    accepted.some(
      (a) => a.eventId === p.eventId && a.residentId === p.subjectId
    );

  function scheduleAll() {
    for (const p of kept) {
      recordAccepted(p.eventId, [p.subjectId, p.companionId, ...p.alsoThere]);
    }
  }

  return (
    <PageContainer width="wide">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">Floor 2</p>
          <h1 className="display mt-2 text-headline text-ink">Your floor</h1>
          <p className="mt-2 max-w-prose text-caption leading-relaxed text-muted">
            Who has been seeing whom this week, and a plan for next week that
            puts the residents drifting furthest out first.
          </p>
        </div>
        <dl className="flex gap-8">
          <Stat label="Pairings" value={kept.length} tone="text-accent" />
          <Stat label="Watched" value={priorities.length} />
          <Stat
            label="Unplaced"
            value={plan?.unplaced.length ?? 0}
            tone="text-high"
          />
        </dl>
      </header>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-raised px-4 py-2.5 text-caption font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            strokeWidth={2}
          />
          {loading ? "Planning…" : "Regenerate"}
        </button>
        {kept.length > 0 && (
          <button
            type="button"
            onClick={scheduleAll}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-caption font-medium text-white transition hover:bg-accent-deep"
          >
            <CalendarCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            Schedule all {kept.length}
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <SectionHeader
            icon={Users}
            title="Who has been together"
            hint="last 7 days"
          />
          <div className="mt-3">
            <RecentConnections compact />
          </div>
          {isolated.length > 0 && (
            <p className="mt-3 rounded-xl bg-high-soft px-4 py-3 text-caption leading-relaxed text-high">
              <strong className="font-semibold">
                {isolated
                  .map((id) => findResident(id)?.firstName)
                  .filter(Boolean)
                  .join(" and ")}
              </strong>{" "}
              barely saw anyone this week. The plan places them first.
            </p>
          )}

          <SectionHeader
            icon={Sparkles}
            title="Worth adding"
            hint="from shared interests"
            className="mt-6"
          />
          <ul className="mt-3 space-y-2">
            {gaps.map((g) => (
              <li
                key={g.interest}
                className="rounded-xl border border-line bg-raised px-5 py-3.5"
              >
                <p className="text-body text-ink">{g.suggestion}</p>
                <p className="mt-1 text-caption text-muted">
                  {g.count} residents list {g.interest}, and nothing on the
                  calendar covers it.
                </p>
              </li>
            ))}
            {gaps.length === 0 && (
              <li className="rounded-xl border border-dashed border-line bg-surface px-5 py-4 text-caption text-muted">
                Every interest on the floor is covered by something already on
                the calendar.
              </li>
            )}
          </ul>
        </aside>

        <div className="min-w-0">
      {loading && (
        <p className="text-body text-muted">Scoring the floor…</p>
      )}

      {!loading && kept.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-7 text-body text-muted">
          Nothing to suggest — every watched resident is already placed, or no
          eligible companion is free this week.
        </p>
      )}

      {byDay.map(({ day, rows }) => (
        <section key={day} className="mt-8">
          <SectionHeader icon={CalendarDays} title={day} hint={`${rows.length} ${rows.length === 1 ? "session" : "sessions"}`} />
          <ul className="mt-3 space-y-3">
            {rows.map((p) => {
              const subject = findResident(p.subjectId);
              const companion = findResident(p.companionId);
              if (!subject || !companion) return null;
              const done = isScheduled(p);

              return (
                <li
                  key={key(p)}
                  className={`kw-rise rounded-2xl border p-5 transition ${
                    done ? "border-accent/40 bg-accent-soft/30" : "border-line bg-raised"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center">
                      <Avatar
                        residentId={subject.id}
                        firstName={subject.firstName}
                        lastName={subject.lastName}
                        size="sm"
                        ring="raised"
                      />
                      <span className="-ml-2">
                        <Avatar
                          residentId={companion.id}
                          firstName={companion.firstName}
                          lastName={companion.lastName}
                          size="sm"
                          ring="raised"
                          letters="first"
                        />
                      </span>
                      {p.alsoThere.map((id) => {
                        const extra = findResident(id);
                        return extra ? (
                          <span key={id} className="-ml-2">
                            <Avatar
                              residentId={id}
                              firstName={extra.firstName}
                              lastName={extra.lastName}
                              size="sm"
                              ring="raised"
                              letters="first"
                            />
                          </span>
                        ) : null;
                      })}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-body text-ink">
                        <Link
                          href={`/residents/${subject.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {subject.firstName} {subject.lastName}
                        </Link>{" "}
                        <span className="text-muted">with</span>{" "}
                        <Link
                          href={`/residents/${companion.id}`}
                          className="hover:text-accent"
                        >
                          {companion.firstName}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-caption text-muted">
                        {p.eventTitle} · {p.startTime}
                        {p.alsoThere.length > 0 && (
                          <>
                            {" · with "}
                            {p.alsoThere
                              .map((id) => findResident(id)?.firstName)
                              .filter(Boolean)
                              .join(", ")}
                          </>
                        )}
                      </p>
                    </div>

                    <RiskBadge level={subject.riskLevel} showScore={subject.riskScore} />
                    <Tag tone="accent">{p.score}</Tag>

                    {done ? (
                      <span className="text-caption font-medium text-accent">
                        Scheduled
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            recordAccepted(p.eventId, [p.subjectId, p.companionId])
                          }
                          className="rounded-lg bg-ink px-3 py-2 text-micro font-medium text-paper transition hover:bg-ink-soft"
                        >
                          Schedule
                        </button>
                        <button
                          type="button"
                          aria-label="Remove from plan"
                          onClick={() =>
                            setDropped((d) => new Set(d).add(key(p)))
                          }
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-high-soft hover:text-high"
                        >
                          <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-caption leading-relaxed text-ink-soft">
                    {p.reason}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

        </div>
      </div>

      {plan && plan.unplaced.length > 0 && (
        <section className="mt-10">
          <SectionHeader icon={TriangleAlert} title="Couldn't place" tone="alert" />
          <ul className="mt-3 space-y-2">
            {plan.unplaced.map((u) => {
              const r = findResident(u.residentId);
              return (
                <li key={u.residentId} className="flex items-center gap-3">
                  <Avatar
                    residentId={u.residentId}
                    firstName={r?.firstName ?? "?"}
                    lastName={r?.lastName}
                    size="xs"
                  />
                  <span className="text-caption text-ink-soft">
                    {r?.firstName} {r?.lastName}
                  </span>
                  <span className="text-micro text-muted">{u.reason}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}

function key(p: PlannedPairing) {
  return `${p.subjectId}-${p.companionId}-${p.eventId}`;
}
