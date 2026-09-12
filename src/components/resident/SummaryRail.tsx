"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Resident } from "@shared/types";
import { historyFor } from "@/lib/roster";
import { staffFor } from "@/lib/staff";
import { riskHex, trendLabel } from "@/lib/ui";
import { useFlowResults } from "./ResidentFlowProvider";
import Sparkline from "../Sparkline";
import Avatar from "../ui/Avatar";
import RiskBadge from "../ui/RiskBadge";

/**
 * Persistent identity + progress column. Living in the layout, it is the
 * thing that makes the surviving flow state visible: the checklist fills
 * in as you work and stays filled as you move between tabs.
 */
export default function SummaryRail({ resident }: { resident: Resident }) {
  const { extracted, match, prescription, merged } = useFlowResults();
  const owner = staffFor(resident.id);

  const steps = [
    { label: "Profile built", done: extracted, href: "profile" },
    { label: "Companion matched", done: Boolean(match), href: "pair" },
    {
      label: "Activity scheduled",
      done: prescription?.status === "accepted",
      href: "schedule",
    },
  ];

  return (
    <div className="lg:sticky lg:top-6">
      <Link
        href="/residents"
        className="text-caption text-muted transition hover:text-accent"
      >
        ← Roster
      </Link>

      <div className="mt-4 flex items-center gap-4 lg:block">
        <Avatar
          residentId={resident.id}
          firstName={resident.firstName}
          lastName={resident.lastName}
          size="xl"
        />
        <div className="lg:mt-4">
          <h1 className="display text-title leading-tight text-ink">
            {resident.firstName} {resident.lastName}
          </h1>
          <p className="mt-1 text-caption text-muted">
            Room {resident.roomNumber} · Floor 2
          </p>
          {owner && (
            <p className="mt-1.5 text-micro text-muted">
              Assigned to{" "}
              <span className="font-medium text-accent">
                {owner.firstName} {owner.lastName}
              </span>{" "}
              · {owner.role}
            </p>
          )}
        </div>
      </div>

      {/* ---- Risk at a glance ---- */}
      <div className="mt-6 rounded-2xl border border-line bg-raised p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Isolation risk</p>
            <p className="display mt-1 text-headline leading-none tabular-nums text-ink">
              {resident.riskScore}
            </p>
          </div>
          <Sparkline
            values={historyFor(resident.id)}
            color={riskHex(resident.riskLevel)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <RiskBadge level={resident.riskLevel} />
          <span
            className={`text-caption font-medium ${
              resident.riskTrend > 0 ? "text-high" : "text-low"
            }`}
          >
            {trendLabel(resident.riskTrend)}
          </span>
        </div>
      </div>

      {/* ---- Progress ---- */}
      <ol className="mt-5 space-y-2.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition ${
                s.done
                  ? "bg-accent text-white"
                  : "bg-line-soft text-transparent ring-1 ring-inset ring-line"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span
              className={`text-caption ${s.done ? "text-ink" : "text-faint"}`}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {/* ---- What we know so far ---- */}
      {extracted && merged.interests.length > 0 && (
        <div className="kw-fade mt-6">
          <p className="eyebrow">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {merged.interests.map((i) => (
              <span
                key={i}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-micro text-accent-deep"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
