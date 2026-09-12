import Link from "next/link";
import { notFound } from "next/navigation";
import {
  helenCarePlanText,
  helenIntakeText,
  marginCarePlanText,
  margaretIntakeText,
} from "@shared/seed";
import { findResident } from "@/lib/roster";
import { initials, riskTone, trendLabel } from "@/lib/ui";
import ResidentWorkspace from "@/components/ResidentWorkspace";

// Raw notes that feed the live extraction demo. Only Margaret and Helen
// are fully built — everyone else on the roster is risk data only, and
// their page says so rather than faking a profile.
const rawNotes: Record<string, { carePlan: string; intake: string }> = {
  margaret: { carePlan: marginCarePlanText, intake: margaretIntakeText },
  helen: { carePlan: helenCarePlanText, intake: helenIntakeText },
};

export default async function ResidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = findResident(id);
  if (!resident) notFound();

  const tone = riskTone(resident.riskLevel);
  const notes = rawNotes[resident.id];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      <Link
        href="/"
        className="text-[12.5px] text-muted transition hover:text-accent"
      >
        ← Roster
      </Link>

      {/* ---- Identity ---- */}
      <header className="mt-5 flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-line-soft text-[15px] font-semibold text-ink-soft"
        >
          {initials(resident.firstName, resident.lastName)}
        </span>
        <div>
          <h1 className="display text-[32px] leading-none text-ink">
            {resident.firstName} {resident.lastName}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            Room {resident.roomNumber} · Floor 2
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1.5 text-[11px] font-medium ${tone.badge}`}
        >
          {tone.label}
        </span>
      </header>

      {/* ---- Step 1: risk explained (static, no live engine) ---- */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-raised">
        <div className="flex flex-wrap items-end gap-x-12 gap-y-6 p-7">
          <div>
            <p className="eyebrow">Isolation risk</p>
            <div className="mt-2.5 flex items-baseline gap-3">
              <span className="display text-[60px] leading-none tabular-nums text-ink">
                {resident.riskScore}
              </span>
              <span className={`text-[13px] font-medium ${
                resident.riskTrend > 0 ? "text-high" : "text-low"
              }`}
              >
                {trendLabel(resident.riskTrend)}
              </span>
            </div>
          </div>

          <div className="w-full max-w-xs flex-1">
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${tone.bar}`}
                style={{ width: `${resident.riskScore}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10.5px] text-faint">
              <span>Connected</span>
              <span>Isolated</span>
            </div>
          </div>
        </div>

        <div className="border-t border-line-soft bg-surface px-7 py-6">
          <p className="eyebrow">What&apos;s driving this</p>
          <ul className="mt-3.5 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
            {resident.riskFactors.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-soft"
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

      {/* ---- Steps 2-4: extraction → matching → prescription ---- */}
      {notes ? (
        <ResidentWorkspace
          residentId={resident.id}
          residentName={resident.firstName}
          initialCarePlanText={notes.carePlan}
          initialIntakeText={notes.intake}
        />
      ) : (
        <section className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-7">
          <h2 className="display text-[19px] text-ink">No social profile yet</h2>
          <p className="mt-2 max-w-prose text-[13.5px] leading-relaxed text-ink-soft">
            Mosaic is tracking {resident.firstName}&apos;s risk signals, but
            hasn&apos;t ingested a care plan or intake note yet. Once those
            records are connected, this page builds a profile and starts
            recommending companions — the same way it does for Margaret Chen.
          </p>
          <Link
            href="/residents/margaret"
            className="mt-5 inline-block text-[13px] font-medium text-accent underline-offset-4 hover:underline"
          >
            See a completed profile →
          </Link>
        </section>
      )}
    </div>
  );
}
