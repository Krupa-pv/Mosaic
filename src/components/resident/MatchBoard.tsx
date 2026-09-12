"use client";

import { useMemo, useState } from "react";
import { Ban, Check, SlidersHorizontal } from "lucide-react";
import type { MatchCandidate } from "@/lib/api";
import { findResident } from "@/lib/roster";
import { HEX } from "@/lib/ui";
import Avatar from "../ui/Avatar";
import RiskBadge from "../ui/RiskBadge";
import SectionHeader from "../ui/SectionHeader";
import Tag from "../ui/Tag";

type FilterKey = "all" | "shared" | "stable" | "morning";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "shared", label: "Shares an interest" },
  { key: "stable", label: "Stable companions" },
  { key: "morning", label: "Strong schedule fit" },
];

/**
 * The scored field, with the leading three given room to be read.
 * Everyone else is one click away, and hard-filtered residents stay on
 * screen with their reason — that row is the clearest evidence that a
 * deterministic rule is running, not a model guessing.
 */
export default function MatchBoard({
  candidates,
  selectedId,
  subjectInterests,
  onChoose,
}: {
  candidates: MatchCandidate[];
  selectedId: string;
  subjectInterests: string[];
  onChoose: (residentId: string) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAll, setShowAll] = useState(false);

  const eligible = useMemo(
    () => candidates.filter((c) => !c.filtered),
    [candidates]
  );
  const excluded = useMemo(
    () => candidates.filter((c) => c.filtered),
    [candidates]
  );

  const shown = useMemo(() => {
    const subject = new Set(subjectInterests.map((i) => i.toLowerCase()));
    return eligible.filter((c) => {
      const r = findResident(c.residentId);
      switch (filter) {
        case "shared":
          return (c.interests ?? []).some((i) => subject.has(i.toLowerCase()));
        case "stable":
          return r?.riskLevel === "low";
        case "morning":
          return (c.components?.schedule ?? 0) >= 90;
        default:
          return true;
      }
    });
  }, [eligible, filter, subjectInterests]);

  const top = shown.slice(0, 3);
  const rest = shown.slice(3);

  return (
    <div className="mt-6">
      {/* ---- Filters ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal
          aria-hidden
          className="h-3.5 w-3.5 text-muted"
          strokeWidth={1.75}
        />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-caption transition ${
              filter === f.key
                ? "bg-accent font-medium text-white"
                : "bg-raised text-ink-soft ring-1 ring-inset ring-line hover:bg-accent-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-caption text-muted">
          {shown.length} of {eligible.length} eligible
        </span>
      </div>

      {/* ---- Leading three ---- */}
      {top.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-line bg-surface p-6 text-body text-muted">
          Nobody matches that filter. Try widening it.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {top.map((c, i) => (
            <BigCard
              key={c.residentId}
              candidate={c}
              rank={i + 1}
              selected={c.residentId === selectedId}
              subjectInterests={subjectInterests}
              onChoose={onChoose}
            />
          ))}
        </div>
      )}

      {/* ---- The rest ---- */}
      {rest.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-caption font-medium text-accent hover:underline"
          >
            {showAll
              ? "Hide the rest"
              : `View ${rest.length} more ${rest.length === 1 ? "match" : "matches"}`}
          </button>

          {showAll && (
            <div className="kw-rise mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((c) => (
                <SmallCard
                  key={c.residentId}
                  candidate={c}
                  selected={c.residentId === selectedId}
                  onChoose={onChoose}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Hard-filtered ---- */}
      {excluded.length > 0 && (
        <div className="mt-6">
          <SectionHeader
            icon={Ban}
            title="Ruled out by a hard filter"
            tone="alert"
            hint={`${excluded.length} residents`}
          />
          <ul className="mt-3 space-y-2.5 rounded-2xl border border-line bg-surface p-5">
            {excluded.map((c) => {
              const r = findResident(c.residentId);
              return (
                <li key={c.residentId} className="flex items-start gap-3">
                  <Avatar
                    residentId={c.residentId}
                    firstName={r?.firstName ?? "?"}
                    lastName={r?.lastName}
                    size="xs"
                  />
                  <div className="min-w-0">
                    <span className="text-caption text-muted line-through decoration-faint">
                      {r ? `${r.firstName} ${r.lastName}` : c.residentId}
                    </span>
                    <p className="text-micro leading-relaxed text-muted">
                      {c.note}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- cards ---------------- */

function BigCard({
  candidate,
  rank,
  selected,
  subjectInterests,
  onChoose,
}: {
  candidate: MatchCandidate;
  rank: number;
  selected: boolean;
  subjectInterests: string[];
  onChoose: (id: string) => void;
}) {
  const r = findResident(candidate.residentId);
  if (!r) return null;

  const subject = new Set(subjectInterests.map((i) => i.toLowerCase()));
  const shared = (candidate.interests ?? []).filter((i) =>
    subject.has(i.toLowerCase())
  );

  return (
    <div
      className={`kw-rise flex flex-col rounded-2xl border bg-raised p-5 transition ${
        selected ? "border-accent ring-2 ring-accent/20" : "border-line"
      }`}
      style={{ "--kw-delay": `${rank * 60}ms` } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <Avatar
          residentId={r.id}
          firstName={r.firstName}
          lastName={r.lastName}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">
            {r.firstName} {r.lastName}
          </p>
          <p className="text-caption text-muted">Room {r.roomNumber}</p>
          <div className="mt-1.5">
            <RiskBadge level={r.riskLevel} />
          </div>
        </div>
        <ScoreDial score={candidate.score} emphasis={selected} />
      </div>

      {candidate.components && (
        <dl className="mt-4 space-y-1.5">
          {(
            [
              ["Interests", candidate.components.interests],
              ["Care fit", candidate.components.careCompatibility],
              ["Schedule", candidate.components.schedule],
              ["Complementary", candidate.components.complementaryTraits],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="flex items-center gap-2.5">
              <dt className="w-24 shrink-0 text-micro text-muted">{label}</dt>
              <dd className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${v}%` }}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {shared.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {shared.map((i) => (
            <Tag key={i} tone="accent" size="sm">
              {i}
            </Tag>
          ))}
        </div>
      )}

      <p className="mt-3 flex-1 text-caption leading-relaxed text-ink-soft">
        {candidate.note}
      </p>

      <button
        type="button"
        disabled={selected}
        onClick={() => onChoose(candidate.residentId)}
        className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-caption font-medium transition ${
          selected
            ? "bg-accent-soft text-accent-deep"
            : "bg-ink text-paper hover:bg-ink-soft"
        }`}
      >
        {selected && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />}
        {selected ? "Paired" : `Pair with ${r.firstName}`}
      </button>
    </div>
  );
}

function SmallCard({
  candidate,
  selected,
  onChoose,
}: {
  candidate: MatchCandidate;
  selected: boolean;
  onChoose: (id: string) => void;
}) {
  const r = findResident(candidate.residentId);
  if (!r) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-raised p-3.5 ${
        selected ? "border-accent" : "border-line"
      }`}
    >
      <Avatar
        residentId={r.id}
        firstName={r.firstName}
        lastName={r.lastName}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption text-ink">
          {r.firstName} {r.lastName}
        </p>
        <p className="text-micro text-muted">Room {r.roomNumber}</p>
      </div>
      <span className="font-mono text-caption tabular-nums text-muted">
        {candidate.score}
      </span>
      <button
        type="button"
        disabled={selected}
        onClick={() => onChoose(candidate.residentId)}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-micro font-medium text-accent transition hover:bg-accent-soft disabled:text-faint"
      >
        {selected ? "Paired" : "Pair"}
      </button>
    </div>
  );
}

function ScoreDial({ score, emphasis }: { score: number; emphasis: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke={HEX.line} strokeWidth="3.5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={emphasis ? HEX.accent : HEX.faint}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="display absolute inset-0 grid place-items-center text-lead tabular-nums text-ink">
        {score}
      </span>
    </div>
  );
}
