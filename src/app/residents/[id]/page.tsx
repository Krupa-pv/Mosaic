import { notFound } from "next/navigation";
import { findResident, floorAverage, historyFor } from "@/lib/roster";
import { notesFor } from "@/lib/notes";
import { riskHex, riskTone, trendLabel } from "@/lib/ui";
import RiskTrajectory from "@/components/RiskTrajectory";
import ResidentWorkspace from "@/components/ResidentWorkspace";
import NoProfileYet from "@/components/resident/NoProfileYet";

export default async function ResidentPage({
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
      {/* ---- Step 1: risk explained (static, no live engine) ---- */}
      <section className="overflow-hidden rounded-2xl border border-line bg-raised">
        <div className="flex flex-wrap items-end gap-x-12 gap-y-6 p-7">
          <div>
            <p className="eyebrow">Isolation risk</p>
            <div className="mt-2.5 flex items-baseline gap-3">
              <span className="display text-display leading-none tabular-nums text-ink">
                {resident.riskScore}
              </span>
              <span
                className={`text-caption font-medium ${
                  resident.riskTrend > 0 ? "text-high" : "text-low"
                }`}
              >
                {trendLabel(resident.riskTrend)}
              </span>
            </div>
          </div>

          <div className="min-w-[280px] flex-1">
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

      {/* ---- Steps 2-4 ---- */}
      {notesFor(id) ? (
        <ResidentWorkspace />
      ) : (
        <NoProfileYet firstName={resident.firstName} />
      )}
    </>
  );
}
