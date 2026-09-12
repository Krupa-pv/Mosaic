"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  HeartHandshake,
  PhoneCall,
  RotateCcw,
  Sparkles,
  UsersRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Resident, ResidentProfile } from "@shared/types";
import {
  interventionsFor,
  type Intervention,
  type InterventionKind,
} from "@/lib/interventions";
import { addTask, completeTask, useTasks } from "@/lib/tasks";
import { addObservation, useObservations } from "@/lib/observations";
import { CURRENT_STAFF_ID, staffFor } from "@/lib/staff";
import SectionHeader from "../ui/SectionHeader";

const ICONS: Record<InterventionKind, LucideIcon> = {
  pair: UsersRound,
  restart: RotateCcw,
  dining: Utensils,
  family: PhoneCall,
  one_to_one: HeartHandshake,
  solo_activity: Sparkles,
};

/**
 * Every way to help this resident, not just pairing.
 *
 * Each option names the risk factor it answers, so the reason is always
 * next to the action — a seating change for someone eating alone, a
 * phone call for a family that has gone quiet.
 */
export default function InterventionList({
  resident,
  profile,
}: {
  resident: Resident;
  profile?: Partial<ResidentProfile>;
}) {
  const tasks = useTasks({ residentId: resident.id });
  const notes = useObservations(resident.id);
  const options = interventionsFor(resident, {
    profile,
    notes: notes.map((n) => ({ text: n.text, sentiment: n.sentiment })),
  });
  const owner = staffFor(resident.id);

  const openTask = (kind: InterventionKind) =>
    tasks.find((t) => t.kind === kind && !t.doneAt);
  const doneTask = (kind: InterventionKind) =>
    tasks.find((t) => t.kind === kind && t.doneAt);

  return (
    <section className="mt-6">
      <SectionHeader
        icon={HeartHandshake}
        title="Ways to help"
        hint={`ranked for ${resident.firstName}${owner ? ` · ${owner.firstName} is assigned` : ""}`}
      />

      <ul className="mt-3 space-y-3">
        {options.map((o, i) => {
          const Icon = ICONS[o.kind];
          const open = openTask(o.kind);
          const done = doneTask(o.kind);
          const best = i === 0;

          return (
            <li
              key={o.kind}
              className={`rounded-2xl border p-5 transition ${
                done
                  ? "border-accent/40 bg-accent-soft/30"
                  : best
                    ? "border-accent ring-2 ring-accent/15 bg-raised"
                    : open
                      ? "border-accent/50 bg-raised"
                      : "border-line bg-raised"
              }`}
            >
              {best && (
                <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-micro font-semibold tracking-wide text-white uppercase">
                  Best first step
                </p>
              )}
              <div className="flex flex-wrap items-start gap-4">
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    done ? "bg-accent text-white" : "bg-accent-soft text-accent-deep"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-ink">{o.title}</p>
                  <p className="mt-1 text-caption leading-relaxed text-ink-soft">
                    {o.detail}
                  </p>
                  <p className="mt-2 text-micro text-muted">
                    <span className="text-high">Because:</span> {o.because}
                  </p>
                  {best && (
                    <p className="mt-2 rounded-lg bg-accent-soft/60 px-3 py-2 text-micro leading-relaxed text-accent-deep">
                      <span className="font-semibold">Ranked first:</span>{" "}
                      {o.rationale}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-mono text-caption tabular-nums text-muted">
                    {o.score}
                  </span>
                  <span className="text-micro text-faint">{o.effort}</span>
                  <Action
                    intervention={o}
                    residentId={resident.id}
                    open={open?.id}
                    done={Boolean(done)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Action({
  intervention: o,
  residentId,
  open,
  done,
}: {
  intervention: Intervention;
  residentId: string;
  open?: string;
  done: boolean;
}) {
  if (done) {
    return <span className="text-caption font-medium text-accent">Done</span>;
  }

  if (o.href) {
    return (
      <Link
        href={o.href}
        className="group inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-caption font-medium text-paper transition hover:bg-ink-soft"
      >
        Open
        <ArrowRight
          aria-hidden
          className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </Link>
    );
  }

  if (open) {
    return (
      <button
        type="button"
        onClick={() => {
          completeTask(open);
          // Completing writes a note, which is what later drives profile
          // suggestions — the loop closes here.
          addObservation({
            residentId,
            sentiment: "note",
            text: `${o.title.toLowerCase()} — done.`,
          });
        }}
        className="rounded-lg bg-accent px-3.5 py-2 text-caption font-medium text-white transition hover:bg-accent-deep"
      >
        Mark done
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        addTask({
          residentId,
          staffId: CURRENT_STAFF_ID,
          kind: o.kind,
          title: o.title,
          because: o.because,
        })
      }
      className="rounded-lg bg-raised px-3.5 py-2 text-caption font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-surface"
    >
      Take this on
    </button>
  );
}
