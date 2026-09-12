"use client";

import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import type { Resident } from "@shared/types";
import { admissionNote } from "@/lib/roster";
import { useBuiltProfileIds } from "@/lib/builtProfiles";
import Avatar from "../ui/Avatar";
import SectionHeader from "../ui/SectionHeader";

/**
 * Residents nobody has profiled yet.
 *
 * Client-side on purpose: it has to consult profiles built in the app,
 * not just the server's copy. Otherwise building one leaves the roster
 * still insisting it's missing, which is exactly what it did before.
 */
export default function AwaitingProfiles({
  residents,
  serverAwaiting,
}: {
  residents: Resident[];
  serverAwaiting: string[];
}) {
  const built = useBuiltProfileIds();
  const waiting = residents.filter(
    (r) => serverAwaiting.includes(r.id) && !built.has(r.id)
  );

  if (waiting.length === 0) return null;

  return (
    <section className="kw-rise mt-8">
      <SectionHeader
        icon={UserPlus}
        title="Waiting on you"
        hint={`${waiting.length} without a profile`}
        tone="alert"
      />
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {waiting.map((r) => (
          <li key={r.id}>
            <Link
              href={`/residents/${r.id}/profile`}
              className="group flex items-center gap-4 rounded-2xl border-2 border-mid/50 bg-mid-soft/40 p-5 transition hover:border-mid"
            >
              <Avatar
                residentId={r.id}
                firstName={r.firstName}
                lastName={r.lastName}
                size="md"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium text-ink">
                  {r.firstName} {r.lastName}
                </span>
                <span className="block text-caption text-muted">
                  Room {r.roomNumber}
                  {admissionNote(r.id) && ` · ${admissionNote(r.id)}`}
                </span>
                <span className="mt-1.5 block text-caption font-medium text-mid">
                  No care plan read yet — Mosaic can&apos;t match them
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-mid transition group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
