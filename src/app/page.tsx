import Link from "next/link";
import { allResidents } from "@/lib/roster";
import { initials, riskTone, trendLabel } from "@/lib/ui";

export default function DashboardPage() {
  const sorted = [...allResidents].sort((a, b) => b.riskScore - a.riskScore);
  const flagged = sorted.filter((r) => r.riskLevel === "high");
  const rising = sorted.filter((r) => r.riskTrend > 0);
  const top = flagged[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      {/* ---- Editorial header ---- */}
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">Floor 2 · Today</p>
          <h1 className="display mt-2 text-[40px] leading-[1.05] text-ink sm:text-[46px]">
            Who&apos;s drifting
            <br />
            out of reach
          </h1>
        </div>
        <dl className="flex gap-8">
          <Stat label="Residents" value={allResidents.length} />
          <Stat label="Elevated" value={flagged.length} tone="text-high" />
          <Stat label="Rising" value={rising.length} tone="text-mid" />
        </dl>
      </header>

      {/* ---- Lead signal ---- */}
      {top && (
        <Link
          href={`/residents/${top.id}`}
          className="group mt-10 flex items-start gap-4 rounded-2xl border border-line bg-raised p-5 transition hover:border-accent/35"
        >
          <span
            aria-hidden
            className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-high"
          />
          <div className="min-w-0">
            <p className="eyebrow text-high">Sharpest change this week</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">
                {top.firstName} {top.lastName}
              </span>{" "}
              has climbed {top.riskTrend} points in three weeks — attendance,
              shared meals and staff notes are all moving the same direction.
            </p>
          </div>
          <span
            aria-hidden
            className="ml-auto hidden shrink-0 self-center text-muted transition group-hover:translate-x-0.5 group-hover:text-accent sm:block"
          >
            →
          </span>
        </Link>
      )}

      {/* ---- Roster ---- */}
      <div className="mt-12">
        <div className="flex items-baseline justify-between border-b border-line pb-2.5">
          <h2 className="eyebrow">Roster</h2>
          <span className="eyebrow font-normal tracking-normal normal-case text-faint">
            Ranked by isolation risk
          </span>
        </div>

        <ul>
          {sorted.map((r) => {
            const tone = riskTone(r.riskLevel);
            return (
              <li key={r.id} className="border-b border-line-soft">
                <Link
                  href={`/residents/${r.id}`}
                  className="group flex items-center gap-4 py-3.5 transition"
                >
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-line-soft text-[11.5px] font-semibold text-ink-soft transition group-hover:bg-accent-soft group-hover:text-accent-deep"
                  >
                    {initials(r.firstName, r.lastName)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] text-ink transition group-hover:text-accent-deep">
                      {r.firstName} {r.lastName}
                    </span>
                    <span className="block text-[11.5px] text-muted">
                      Room {r.roomNumber}
                    </span>
                  </span>

                  <span className="hidden w-28 text-right text-[11.5px] text-muted sm:block">
                    {trendLabel(r.riskTrend)}
                  </span>

                  <span className="hidden w-24 sm:block">
                    <span className="block h-[3px] w-full overflow-hidden rounded-full bg-line">
                      <span
                        className={`block h-full rounded-full ${tone.bar}`}
                        style={{ width: `${r.riskScore}%` }}
                      />
                    </span>
                  </span>

                  <span className="w-10 text-right font-mono text-[15px] tabular-nums text-ink">
                    {r.riskScore}
                  </span>

                  <span
                    className={`w-[70px] shrink-0 rounded-full px-2 py-1 text-center text-[10.5px] font-medium ${tone.badge}`}
                  >
                    {tone.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div>
      <dd className={`display text-[30px] leading-none tabular-nums ${tone}`}>
        {value}
      </dd>
      <dt className="eyebrow mt-1.5">{label}</dt>
    </div>
  );
}
