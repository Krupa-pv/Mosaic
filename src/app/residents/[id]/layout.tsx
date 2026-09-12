import { notFound } from "next/navigation";
import { findResident } from "@/lib/roster";
import { notesFor } from "@/lib/notes";
import ResidentFlowProvider from "@/components/resident/ResidentFlowProvider";
import SummaryRail from "@/components/resident/SummaryRail";

// This layout is what makes the subpage split possible: Next preserves a
// layout's client state across sibling child routes, so the flow provider
// below survives moving between overview / profile / pair / schedule.
// Navigating to a *different* resident changes the [id] segment and
// remounts it, which is what we want — one resident's extraction must
// never leak onto another's page.
export default async function ResidentLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const resident = findResident(id);
  if (!resident) notFound();

  const notes = notesFor(id);

  return (
    <ResidentFlowProvider
      residentId={resident.id}
      residentName={resident.firstName}
      initialCarePlanText={notes?.carePlan ?? ""}
      initialIntakeText={notes?.intake ?? ""}
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside>
          <SummaryRail resident={resident} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </ResidentFlowProvider>
  );
}
