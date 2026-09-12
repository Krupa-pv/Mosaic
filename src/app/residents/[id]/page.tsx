import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { findResident, floorAverage, historyFor } from "@/lib/roster";
import { notesFor } from "@/lib/notes";
import { riskHex, riskTone } from "@/lib/ui";
import RiskTrajectory from "@/components/RiskTrajectory";
import NoProfileYet from "@/components/resident/NoProfileYet";
import ResidentInterventions from "@/components/resident/ResidentInterventions";

/** Overview: why this resident is flagged. The rail carries the score,
 *  so this leads with the trajectory and the drivers behind it. */
export default async function ResidentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = findResident(id);
  if (!resident) notFound();

  const tone = riskTone(resident.riskLevel);
  const hasNotes = Boolean(notesFor(id));

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-raised">
        <div className="p-7">
          <h2 className="display text-title leading-tight text-ink">
            Six weeks of drift
          </h2>
          <p className="mt-1.5 max-w-prose text-caption leading-relaxed text-muted">
            {resident.firstName}&apos;s isolation risk against the floor
            average.
          </p>
          <div className="mt-5">
            <RiskTrajectory
              values={historyFor(resident.id)}
              average={floorAverage()}
              name={resident.firstName}
              color={riskHex(resident.riskLevel)}
            />
          </div>
        </div>

        <div className="border-t border-line-soft bg-surface px-7 py-6">
          <p className="eyebrow">What&apos;s driving this</p>
          <ul className="mt-3.5 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
            {resident.riskFactors.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-caption leading-relaxed text-ink-soft"
              >
                <span
                  aria-hidden
                  className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${tone.dot}`}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ResidentInterventions resident={resident} />

      {hasNotes ? (
        <Link
          href={`/residents/${id}/profile`}
          className="group mt-6 flex items-center gap-4 rounded-2xl border border-line bg-raised p-6 transition hover:border-accent/40"
        >
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-ink">
              Build {resident.firstName}&apos;s social profile
            </p>
            <p className="mt-1 text-caption leading-relaxed text-muted">
              Her care plan and intake note are on file. Mosaic can turn them
              into interests, preferences and constraints — which sharpens
              every option above.
            </p>
          </div>
          <ArrowRight
            aria-hidden
            className="h-4 w-4 shrink-0 text-accent transition group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Link>
      ) : (
        <NoProfileYet firstName={resident.firstName} />
      )}
    </>
  );
}
