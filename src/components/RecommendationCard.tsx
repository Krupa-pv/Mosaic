"use client";

import type { MatchComponents, ResidentMatch, SocialPrescription } from "@shared/types";
import { findResident } from "@/lib/roster";
import { initials } from "@/lib/ui";
import PairSchedule from "./PairSchedule";

const COMPONENT_LABELS: Record<keyof MatchComponents, string> = {
  interests: "Shared interests",
  socialPreferences: "Social preferences",
  careCompatibility: "Care compatibility",
  schedule: "Schedule overlap",
  personality: "Personality",
  complementaryTraits: "Complementary traits",
};

export default function RecommendationCard({
  match,
  prescription,
  loadingEvent,
  fallback,
  onAccept,
  onDecline,
}: {
  match: ResidentMatch;
  prescription: SocialPrescription | null;
  loadingEvent: boolean;
  fallback: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const a = findResident(match.residentAId);
  const b = findResident(match.residentBId);
  const status = prescription?.status ?? match.status;
  const settled = status === "accepted" || status === "declined";

  return (
    <div className="kw-rise mt-4 overflow-hidden rounded-2xl border border-line bg-raised">
      {/* ---- Pair + score ---- */}
      <div className="flex flex-wrap items-center gap-5 border-b border-line-soft px-7 py-6">
        <div className="flex items-center">
          <Avatar name={a ? `${a.firstName} ${a.lastName}` : match.residentAId} />
          <Avatar
            name={b ? `${b.firstName} ${b.lastName}` : match.residentBId}
            overlap
          />
        </div>

        <div className="min-w-0">
          <p className="display text-[22px] leading-tight text-ink">
            {a?.firstName ?? match.residentAId} &amp;{" "}
            {b?.firstName ?? match.residentBId}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            Room {a?.roomNumber} · Room {b?.roomNumber}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {fallback && (
            <span className="rounded-full bg-mid-soft px-2 py-0.5 text-[9.5px] font-medium text-mid">
              cached
            </span>
          )}
          <ScoreRing score={match.score} />
        </div>
      </div>

      {/* ---- Deterministic components ---- */}
      <div className="px-7 py-6">
        <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {(Object.keys(COMPONENT_LABELS) as (keyof MatchComponents)[]).map((k) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-[12px] text-ink-soft">
                {COMPONENT_LABELS[k]}
              </span>
              <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${match.components[k]}%` }}
                />
              </span>
              <span className="w-7 text-right font-mono text-[11.5px] tabular-nums text-muted">
                {match.components[k]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-line-soft pt-3.5 text-[11px] leading-relaxed text-faint">
          Scored by a deterministic function — hard filters first, then weighted
          components. The model never sets this number.
        </p>
      </div>

      {/* ---- LLM rationale ---- */}
      <div className="border-t border-line-soft bg-surface px-7 py-6">
        <p className="eyebrow">Why this pair</p>
        <p className="display mt-2.5 text-[17px] leading-[1.55] text-ink-soft">
          {match.rationale}
        </p>
      </div>

      {/* ---- Event ---- */}
      {loadingEvent && (
        <div className="border-t border-line-soft px-7 py-6 text-[13px] text-muted">
          Finding an activity that fits both…
        </div>
      )}

      {prescription && (
        <div className="kw-rise border-t border-line-soft px-7 py-6">
          <p className="eyebrow">Recommended activity</p>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h4 className="display text-[24px] leading-tight text-ink">
              {prescription.event.title}
            </h4>
            <span className="text-[12.5px] text-muted">
              {prescription.event.startTime} · {prescription.event.location}
            </span>
          </div>

          <p className="mt-3 max-w-prose text-[13.5px] leading-relaxed text-ink-soft">
            {prescription.eventFitReason}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {prescription.event.accessibility.seatedAvailable && <Tag>Seated</Tag>}
            {prescription.event.accessibility.wheelchairAccessible && (
              <Tag>Accessible</Tag>
            )}
            <Tag>{prescription.event.groupSize.replace(/_/g, " ")} group</Tag>
            {prescription.event.interests.map((i) => (
              <Tag key={i}>{i}</Tag>
            ))}
          </div>

          {/* ---- One-tap decision ---- */}
          {!settled ? (
            <div className="mt-7 flex gap-2.5">
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 rounded-xl bg-accent px-4 py-3 text-[13.5px] font-medium text-white transition hover:bg-accent-deep"
              >
                Accept &amp; schedule
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="rounded-xl border border-line px-5 py-3 text-[13.5px] text-ink-soft transition hover:bg-surface"
              >
                Decline
              </button>
            </div>
          ) : (
            <div className="kw-rise mt-7">
              {status === "accepted" ? (
                <>
                  <div className="rounded-xl bg-accent-soft px-5 py-4 text-[13px] leading-relaxed text-accent-deep">
                    <strong className="font-semibold">Scheduled.</strong> Staff
                    will be prompted for a one-tap outcome rating afterwards —
                    that result feeds back into future matches.
                  </div>
                  {a && b && (
                    <PairSchedule a={a} b={b} eventId={prescription.event.id} />
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-surface px-5 py-4 text-[13px] leading-relaxed text-muted">
                  Declined. Mosaic will suggest a different pairing.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink-soft ring-1 ring-inset ring-line">
      {children}
    </span>
  );
}

function Avatar({ name, overlap = false }: { name: string; overlap?: boolean }) {
  const [first, last = ""] = name.split(" ");
  return (
    <span
      aria-hidden
      className={`grid h-12 w-12 place-items-center rounded-full bg-line-soft text-[13px] font-semibold text-ink-soft ring-[3px] ring-raised ${
        overlap ? "-ml-3.5" : ""
      }`}
    >
      {initials(first, last)}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[70px] w-[70px]">
      <svg viewBox="0 0 70 70" className="h-full w-full -rotate-90">
        <circle cx="35" cy="35" r={r} fill="none" stroke="#e0d9cd" strokeWidth="4" />
        <circle
          cx="35"
          cy="35"
          r={r}
          fill="none"
          stroke="#1f5c47"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="display absolute inset-0 grid place-items-center text-[21px] tabular-nums text-ink">
        {score}
      </span>
    </div>
  );
}
