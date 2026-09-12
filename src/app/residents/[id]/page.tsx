import { notFound } from "next/navigation";
import { findResident, floorAverage, historyFor } from "@/lib/roster";
import { riskHex, riskTone } from "@/lib/ui";
import RiskTrajectory from "@/components/RiskTrajectory";
import ResidentInterventions from "@/components/resident/ResidentInterventions";
import ResidentConnections from "@/components/resident/ResidentConnections";
import ProfileSpotlight from "@/components/resident/ProfileSpotlight";

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

      <ResidentConnections resident={resident} />

      <ResidentInterventions resident={resident} />

      <ProfileSpotlight residentId={id} firstName={resident.firstName} />
    </>
  );
}
