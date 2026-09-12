import Link from "next/link";
import { notFound } from "next/navigation";
import { events } from "@shared/seed";
import { titleCase } from "@/lib/ui";
import AttendeeList from "@/components/AttendeeList";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const [day, ...time] = event.startTime.split(" ");

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      <Link
        href="/activities"
        className="text-[12.5px] text-muted transition hover:text-accent"
      >
        ← Activities
      </Link>

      <header className="mt-5">
        <p className="eyebrow">
          {day} · {time.join(" ")} · {event.location}
        </p>
        <h1 className="display mt-2 text-[40px] leading-[1.05] text-ink">
          {event.title}
        </h1>
      </header>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {event.interests.map((i) => (
          <span
            key={i}
            className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] text-accent-deep"
          >
            {i}
          </span>
        ))}
        <Tag>{titleCase(event.groupSize.replace(/_/g, " "))} group</Tag>
        {event.accessibility.seatedAvailable && <Tag>Seated</Tag>}
        {event.accessibility.wheelchairAccessible && <Tag>Wheelchair accessible</Tag>}
        <Tag>{titleCase(event.accessibility.physicalIntensity)} intensity</Tag>
      </div>

      <AttendeeList eventId={event.id} />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink-soft ring-1 ring-inset ring-line">
      {children}
    </span>
  );
}
