"use client";

import { useMemo } from "react";
import Link from "next/link";
import { UserMinus, Users } from "lucide-react";
import type { Resident } from "@shared/types";
import { buildConnections, companionsOf, lostContacts } from "@/lib/connections";
import { useAllAccepted } from "@/lib/accepted";
import { findResident, isNewAdmission } from "@/lib/roster";
import Avatar from "../ui/Avatar";
import SectionHeader from "../ui/SectionHeader";

/**
 * This resident's own social network, and how it has shrunk.
 *
 * The floor-wide map answers "who is isolated"; this answers "who is
 * THIS person still seeing, and who have they stopped seeing" — which is
 * the thing a caregiver standing outside their door needs.
 */
export default function ResidentConnections({
  resident,
}: {
  resident: Resident;
}) {
  const accepted = useAllAccepted();
  const graph = useMemo(() => buildConnections(accepted), [accepted]);

  const companions = companionsOf(graph, resident.id);
  const lost = lostContacts(graph, resident.id);
  const isNew = isNewAdmission(resident.id);

  const before = companions.length + lost.length;

  return (
    <section className="mt-6">
      <SectionHeader
        icon={Users}
        title="Who they're still seeing"
        hint={`last ${graph.windowDays} days`}
        tone={companions.length === 0 ? "alert" : "dark"}
      />

      <div className="mt-3 rounded-2xl border border-line bg-raised p-6">
        <p className="text-lead leading-snug text-ink">
          {companions.length === 0 ? (
            isNew ? (
              <>
                {resident.firstName} hasn&apos;t met anyone yet — she arrived
                this week.
              </>
            ) : (
              <>
                {resident.firstName} has shared a room with{" "}
                <strong className="font-medium text-high">nobody</strong> in the
                last week.
              </>
            )
          ) : (
            <>
              {resident.firstName} still sees{" "}
              <strong className="font-medium text-accent">
                {companions.length}{" "}
                {companions.length === 1 ? "person" : "people"}
              </strong>
              {lost.length > 0 && (
                <>
                  , down from{" "}
                  <strong className="font-medium text-high">{before}</strong>
                </>
              )}
              .
            </>
          )}
        </p>

        {companions.length > 0 && (
          <div className="mt-5">
            <p className="eyebrow">Still in touch</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {companions.map((c) => {
                const r = findResident(c.residentId);
                if (!r) return null;
                return (
                  <li key={c.residentId}>
                    <Link
                      href={`/residents/${r.id}`}
                      className="flex items-center gap-2.5 rounded-full bg-surface py-1.5 pr-4 pl-1.5 ring-1 ring-inset ring-line transition hover:ring-accent"
                    >
                      <Avatar
                        residentId={r.id}
                        firstName={r.firstName}
                        lastName={r.lastName}
                        size="xs"
                      />
                      <span className="text-caption text-ink">
                        {r.firstName}
                      </span>
                      <span className="font-mono text-micro text-muted">
                        {c.times}×
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {lost.length > 0 && (
          <div className="mt-6 border-t border-line-soft pt-5">
            <p className="eyebrow flex items-center gap-1.5 text-high">
              <UserMinus aria-hidden className="h-3 w-3" strokeWidth={2} />
              Stopped seeing
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {lost.map((l) => {
                const r = findResident(l.residentId);
                if (!r) return null;
                return (
                  <li key={l.residentId}>
                    <Link
                      href={`/residents/${r.id}`}
                      className="flex items-center gap-2.5 rounded-full bg-high-soft/60 py-1.5 pr-4 pl-1.5 transition hover:ring-1 hover:ring-high"
                      title={`Used to share ${l.via.join(", ")}`}
                    >
                      <Avatar
                        residentId={r.id}
                        firstName={r.firstName}
                        lastName={r.lastName}
                        size="xs"
                      />
                      <span className="text-caption text-ink-soft line-through decoration-high/40">
                        {r.firstName}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-caption leading-relaxed text-muted">
              People {resident.firstName} used to share an activity with and
              hasn&apos;t this week.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
