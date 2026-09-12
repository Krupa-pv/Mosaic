import Link from "next/link";
import { residents } from "@shared/seed";
import { initials, riskTone, trendLabel } from "@/lib/ui";

export default function DashboardPage() {
  const sorted = [...residents].sort((a, b) => b.riskScore - a.riskScore);
  const flagged = sorted.filter((r) => r.riskLevel === "high");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Isolation risk
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Residents ranked by social-health risk, updated daily.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <Stat label="Residents monitored" value={String(residents.length)} />
          <Stat
            label="Flagged this week"
            value={String(flagged.length)}
            tone="text-rose-700"
          />
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <span
            aria-hidden
            className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-600 text-[11px] font-bold text-white"
          >
            !
          </span>
          <p className="text-sm text-rose-900">
            <strong className="font-semibold">
              {flagged[0].firstName} {flagged[0].lastName}
            </strong>{" "}
            has the sharpest rise in isolation risk on the floor — up{" "}
            {flagged[0].riskTrend} points in three weeks.
          </p>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {sorted.map((r) => {
          const tone = riskTone(r.riskLevel);
          return (
            <li key={r.id}>
              <Link
                href={`/residents/${r.id}`}
                className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm"
              >
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-600"
                >
                  {initials(r.firstName, r.lastName)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="block text-xs text-stone-500">
                    Room {r.roomNumber} · {r.riskFactors.length} signal
                    {r.riskFactors.length === 1 ? "" : "s"} tracked
                  </span>
                </span>

                <span className="hidden w-40 sm:block">
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <span
                      className={`block h-full rounded-full ${tone.bar}`}
                      style={{ width: `${r.riskScore}%` }}
                    />
                  </span>
                  <span className="mt-1.5 block text-[11px] text-stone-500">
                    {trendLabel(r.riskTrend)}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-right">
                    <span className="block text-lg font-semibold tabular-nums leading-none">
                      {r.riskScore}
                    </span>
                    <span className="block text-[11px] text-stone-500">
                      risk
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${tone.badge}`}
                  >
                    {tone.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-stone-900",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}
