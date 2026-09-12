import Link from "next/link";
import { events } from "@shared/seed";
import { findResident } from "@/lib/roster";
import { attendeesFor } from "@/lib/schedule";
import { titleCase } from "@/lib/ui";

// Read-only view of the same catalog the event recommender scores
// against — this is where "Indoor Garden Circle" comes from.
export default function ActivitiesPage() {
  const seated = events.filter((e) => e.accessibility.seatedAvailable).length;
  const small = events.filter((e) => e.groupSize === "small").length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">This week&apos;s programming</p>
          <h1 className="display mt-2 text-[40px] leading-[1.05] text-ink sm:text-[46px]">
            What&apos;s on
            <br />
            the calendar
          </h1>
        </div>
        <dl className="flex gap-8">
          <Stat label="Activities" value={events.length} />
          <Stat label="Seated" value={seated} />
          <Stat label="Small group" value={small} />
        </dl>
      </header>

      <p className="mt-8 max-w-prose text-[13.5px] leading-relaxed text-muted">
        Every recommendation Mosaic makes is drawn from this catalog. A resident
        pair is filtered against accessibility and group size first, then scored
        on shared interests and schedule — so an activity only ever gets
        suggested to people who can actually attend it.
      </p>

      <div className="mt-12">
        <div className="flex items-baseline justify-between border-b border-line pb-2.5">
          <h2 className="eyebrow">Catalog</h2>
          <span className="text-[11px] text-faint">Floor 2 · recurring</span>
        </div>

        <ul>
          {events.map((e) => {
            const going = attendeesFor(e.id).filter((a) => !a.lapsed);
            return (
              <li key={e.id} className="border-b border-line-soft">
                <Link
                  href={`/activities/${e.id}`}
                  className="group flex flex-wrap items-center gap-x-6 gap-y-3 py-5"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="display text-[20px] leading-tight text-ink transition group-hover:text-accent-deep">
                      {e.title}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted">
                      {e.startTime} · {e.location}
                    </p>
                  </div>

                  <div className="hidden flex-wrap gap-1.5 lg:flex">
                    {e.interests.map((i) => (
                      <Tag key={i} accent>
                        {i}
                      </Tag>
                    ))}
                    <Tag>{titleCase(e.groupSize.replace(/_/g, " "))} group</Tag>
                  </div>

                  <div className="flex w-[136px] shrink-0 items-center justify-end gap-2.5">
                    <AvatarStack residentIds={going.map((a) => a.residentId)} />
                    <span className="font-mono text-[12.5px] tabular-nums text-muted">
                      {going.length}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Tag({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] ${
        accent
          ? "bg-accent-soft text-accent-deep"
          : "bg-surface text-ink-soft ring-1 ring-inset ring-line"
      }`}
    >
      {children}
    </span>
  );
}

function AvatarStack({ residentIds }: { residentIds: string[] }) {
  const shown = residentIds.slice(0, 4);
  const extra = residentIds.length - shown.length;

  return (
    <span className="flex items-center">
      {shown.map((id, i) => {
        const r = findResident(id);
        return (
          <span
            key={id}
            aria-hidden
            className={`grid h-7 w-7 place-items-center rounded-full bg-line-soft text-[9.5px] font-semibold text-ink-soft ring-2 ring-paper ${
              i > 0 ? "-ml-2" : ""
            }`}
          >
            {/* One letter only — the next avatar overlaps this one and
                would clip a second character. */}
            {r ? r.firstName[0] : "?"}
          </span>
        );
      })}
      {extra > 0 && (
        <span
          aria-hidden
          className="-ml-2 grid h-7 w-7 place-items-center rounded-full bg-line text-[9.5px] font-medium text-muted ring-2 ring-paper"
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="display text-[30px] leading-none tabular-nums text-ink">
        {value}
      </dd>
      <dt className="eyebrow mt-1.5">{label}</dt>
    </div>
  );
}
