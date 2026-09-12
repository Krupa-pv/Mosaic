"use client";

import type { MatchComponents, ResidentMatch, SocialPrescription } from "@shared/types";
import { residents } from "@shared/seed";
import { initials } from "@/lib/ui";

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
  const a = residents.find((r) => r.id === match.residentAId);
  const b = residents.find((r) => r.id === match.residentBId);
  const status = prescription?.status ?? match.status;
  const settled = status === "accepted" || status === "declined";

  return (
    <div className="kw-rise mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {/* ---- Pair + score ---- */}
      <div className="flex flex-wrap items-center gap-6 border-b border-stone-100 p-6">
        <div className="flex items-center">
          <Avatar name={a ? `${a.firstName} ${a.lastName}` : match.residentAId} />
          <Avatar
            name={b ? `${b.firstName} ${b.lastName}` : match.residentBId}
            overlap
          />
        </div>

        <div className="min-w-0">
          <p className="font-medium">
            {a?.firstName ?? match.residentAId} &amp;{" "}
            {b?.firstName ?? match.residentBId}
          </p>
          <p className="text-xs text-stone-500">
            Room {a?.roomNumber} · Room {b?.roomNumber}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {fallback && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              cached
            </span>
          )}
          <ScoreRing score={match.score} />
        </div>
      </div>

      {/* ---- Deterministic components ---- */}
      <div className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
        {(Object.keys(COMPONENT_LABELS) as (keyof MatchComponents)[]).map((k) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs text-stone-600">
              {COMPONENT_LABELS[k]}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
              <span
                className="block h-full rounded-full bg-teal-600"
                style={{ width: `${match.components[k]}%` }}
              />
            </span>
            <span className="w-8 text-right text-xs tabular-nums text-stone-500">
              {match.components[k]}
            </span>
          </div>
        ))}
        <p className="sm:col-span-2 text-[11px] text-stone-400">
          Scored by a deterministic function — hard filters first, then weighted
          components. The model never sets this number.
        </p>
      </div>

      {/* ---- LLM rationale ---- */}
      <div className="border-t border-stone-100 bg-stone-50 p-6">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Why this pair
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          {match.rationale}
        </p>
      </div>

      {/* ---- Event ---- */}
      {loadingEvent && (
        <div className="border-t border-stone-100 p-6 text-sm text-stone-500">
          Finding an activity that fits both…
        </div>
      )}

      {prescription && (
        <div className="kw-rise border-t border-stone-100 p-6">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Recommended activity
          </h4>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tracking-tight">
                {prescription.event.title}
              </p>
              <p className="text-sm text-stone-600">
                {prescription.event.startTime} · {prescription.event.location}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">
                {prescription.eventFitReason}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {prescription.event.accessibility.seatedAvailable && (
                  <Tag>Seated</Tag>
                )}
                {prescription.event.accessibility.wheelchairAccessible && (
                  <Tag>Accessible</Tag>
                )}
                <Tag>{prescription.event.groupSize.replace(/_/g, " ")} group</Tag>
                {prescription.event.interests.map((i) => (
                  <Tag key={i}>{i}</Tag>
                ))}
              </div>
            </div>
          </div>

          {/* ---- One-tap decision ---- */}
          {!settled ? (
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Accept &amp; schedule
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="rounded-lg border border-stone-200 px-4 py-3 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                Decline
              </button>
            </div>
          ) : (
            <div
              className={`kw-rise mt-6 rounded-lg p-4 text-sm ${
                status === "accepted"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {status === "accepted" ? (
                <>
                  <strong className="font-semibold">Scheduled.</strong> Both
                  residents added to {prescription.event.title},{" "}
                  {prescription.event.startTime}. Staff will be prompted for a
                  one-tap outcome rating afterwards — that result feeds back into
                  future matches.
                </>
              ) : (
                <>Declined. Kinwell will suggest a different pairing.</>
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
    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
      {children}
    </span>
  );
}

function Avatar({ name, overlap = false }: { name: string; overlap?: boolean }) {
  const [first, last = ""] = name.split(" ");
  return (
    <span
      aria-hidden
      className={`grid h-12 w-12 place-items-center rounded-full bg-stone-200 text-sm font-semibold text-stone-600 ring-2 ring-white ${
        overlap ? "-ml-3" : ""
      }`}
    >
      {initials(first, last)}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[68px] w-[68px]">
      <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#e7e5e4" strokeWidth="6" />
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke="#0f766e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums">
        {score}
      </span>
    </div>
  );
}
