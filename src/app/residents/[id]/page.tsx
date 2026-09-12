import Link from "next/link";
import { notFound } from "next/navigation";
import {
  helenCarePlanText,
  helenIntakeText,
  marginCarePlanText,
  margaretIntakeText,
  residents,
} from "@shared/seed";
import { initials, riskTone, trendLabel } from "@/lib/ui";
import ResidentWorkspace from "@/components/ResidentWorkspace";

// Raw notes that feed the live extraction demo. Only the fully-built
// residents have them; anyone else starts from an empty pane.
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
  const resident = residents.find((r) => r.id === id);
  if (!resident) notFound();

  const tone = riskTone(resident.riskLevel);
  const notes = rawNotes[resident.id] ?? { carePlan: "", intake: "" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-stone-500 transition hover:text-stone-900"
      >
        ← All residents
      </Link>

      {/* ---- Identity ---- */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-full bg-stone-200 text-lg font-semibold text-stone-600"
        >
          {initials(resident.firstName, resident.lastName)}
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {resident.firstName} {resident.lastName}
          </h1>
          <p className="text-sm text-stone-500">Room {resident.roomNumber}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${tone.badge}`}
        >
          {tone.label}
        </span>
      </div>

      {/* ---- Step 1: risk explained (static, no live engine) ---- */}
      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Isolation risk
            </h2>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl font-semibold tabular-nums">
                {resident.riskScore}
              </span>
              <span
                className={`text-sm font-medium ${
                  resident.riskTrend > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {trendLabel(resident.riskTrend)}
              </span>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full rounded-full ${tone.bar}`}
                style={{ width: `${resident.riskScore}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-stone-400">
              <span>Connected</span>
              <span>Isolated</span>
            </div>
          </div>
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-stone-500">
          What&apos;s driving this
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {resident.riskFactors.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-700"
            >
              <span
                aria-hidden
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
              />
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Steps 2-4: extraction → matching → prescription ---- */}
      <ResidentWorkspace
        residentId={resident.id}
        residentName={resident.firstName}
        initialCarePlanText={notes.carePlan}
        initialIntakeText={notes.intake}
      />
    </div>
  );
}
