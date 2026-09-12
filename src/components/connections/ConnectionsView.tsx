"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Grid3x3, Share2, Users } from "lucide-react";
import type { FloorGraph as Graph } from "../../../lib/graph";
import { allResidents } from "@/lib/roster";
import PageContainer from "../ui/PageContainer";
import SectionHeader from "../ui/SectionHeader";
import Stat from "../ui/Stat";
import { buildConnections } from "@/lib/connections";
import CompatibilityMatrix from "./CompatibilityMatrix";
import RecentConnections from "./RecentConnections";
import FloorGraph from "./FloorGraph";

export default function ConnectionsView({ graph }: { graph: Graph }) {
  const [view, setView] = useState<"recent" | "matrix" | "graph">("recent");
  const recent = buildConnections();
  const router = useRouter();

  const blocked = graph.edges.filter((e) => e.blockedBy).length;
  const strong = graph.edges.filter(
    (e) => !e.blockedBy && e.score >= 85
  ).length;
  // Fewest options = most isolated, which is the number staff care about.
  const loneliest = [...graph.nodes].sort((a, b) => a.degree - b.degree)[0];
  const loneliestName = allResidents.find(
    (r) => r.id === loneliest?.residentId
  )?.firstName;

  return (
    <PageContainer width="wide">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">Floor 2</p>
          <h1 className="display mt-2 text-headline text-ink">
            The shape of the floor
          </h1>
          <p className="mt-2 max-w-prose text-caption leading-relaxed text-muted">
            Who is actually seeing whom, and who would get on if they did.
            Recomputed from current rosters and profiles each time this page
            loads.
          </p>
        </div>
        <dl className="flex gap-8">
          {view === "recent" ? (
            <>
              <Stat label="Pairs met" value={recent.connections.length} tone="text-accent" />
              <Stat
                label="Sessions shared"
                value={recent.connections.reduce((s, c) => s + c.times, 0)}
              />
              <Stat label="Barely seen" value={recent.isolated.length} tone="text-high" />
            </>
          ) : (
            <>
              <Stat label="Pairs scored" value={graph.edges.length} />
              <Stat label="Strong matches" value={strong} tone="text-accent" />
              <Stat label="Ruled out" value={blocked} tone="text-high" />
            </>
          )}
        </dl>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="View"
          className="inline-flex rounded-xl bg-raised p-1 ring-1 ring-inset ring-line"
        >
          {(
            [
              ["recent", "Recent connections", Users],
              ["graph", "Compatibility", Share2],
              ["matrix", "Every pair", Grid3x3],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-caption transition ${
                view === key
                  ? "bg-accent font-medium text-white"
                  : "text-ink-soft hover:bg-accent-soft"
              }`}
            >
              <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        {view === "recent"
          ? recent.isolated.length > 0 && (
              <p className="text-caption text-muted">
                <strong className="font-medium text-high">
                  {recent.isolated
                    .map((id) => allResidents.find((r) => r.id === id)?.firstName)
                    .filter(Boolean)
                    .join(", ")}
                </strong>{" "}
                barely saw anyone this week.
              </p>
            )
          : loneliestName && (
              <p className="text-caption text-muted">
                <strong className="font-medium text-high">{loneliestName}</strong>{" "}
                has the fewest strong options on the floor — {loneliest.degree}.
              </p>
            )}
      </div>

      <SectionHeader
        icon={view === "recent" ? Users : view === "graph" ? Share2 : Grid3x3}
        title={
          view === "recent"
            ? `Who has spent time together · last ${recent.windowDays} days`
            : view === "graph"
              ? "Who would get on · compatibility"
              : "Every pair scored"
        }
        hint={
          view === "recent"
            ? `${recent.connections.length} pairs met · ${recent.isolated.length} barely saw anyone`
            : `${graph.edges.length} pairs · ${blocked} ruled out`
        }
        className="mt-5"
      />

      <div className="mt-3">
        {view === "recent" ? (
          <RecentConnections onSelect={(id) => router.push(`/residents/${id}`)} />
        ) : view === "graph" ? (
          <FloorGraph
            graph={graph}
            onSelect={(id) => router.push(`/residents/${id}`)}
          />
        ) : (
          <CompatibilityMatrix
            graph={graph}
            onSelect={(id) => router.push(`/residents/${id}`)}
          />
        )}
      </div>
    </PageContainer>
  );
}
