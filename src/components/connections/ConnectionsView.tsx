"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Grid3x3, Share2 } from "lucide-react";
import type { FloorGraph as Graph } from "../../../lib/graph";
import { allResidents } from "@/lib/roster";
import PageContainer from "../ui/PageContainer";
import SectionHeader from "../ui/SectionHeader";
import Stat from "../ui/Stat";
import CompatibilityMatrix from "./CompatibilityMatrix";
import FloorGraph from "./FloorGraph";

export default function ConnectionsView({ graph }: { graph: Graph }) {
  const [view, setView] = useState<"matrix" | "graph">("graph");
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
          <p className="eyebrow">Floor 2 · every pair scored</p>
          <h1 className="display mt-2 text-headline text-ink">
            The shape of the floor
          </h1>
          <p className="mt-2 max-w-prose text-caption leading-relaxed text-muted">
            Compatibility between all {allResidents.length} residents, scored by
            the same deterministic function that drives every recommendation.
            Recomputed from current profiles each time this page loads.
          </p>
        </div>
        <dl className="flex gap-8">
          <Stat label="Pairs scored" value={graph.edges.length} />
          <Stat label="Strong matches" value={strong} tone="text-accent" />
          <Stat label="Ruled out" value={blocked} tone="text-high" />
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
              ["graph", "Connections", Share2],
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

        {loneliestName && (
          <p className="text-caption text-muted">
            <strong className="font-medium text-high">{loneliestName}</strong>{" "}
            has the fewest strong options on the floor — {loneliest.degree}.
          </p>
        )}
      </div>

      <SectionHeader
        icon={view === "graph" ? Share2 : Grid3x3}
        title={view === "graph" ? "Connection map" : "Every pair scored"}
        hint={`${graph.edges.length} pairs · ${blocked} ruled out`}
        className="mt-5"
      />

      <div className="mt-3">
        {view === "graph" ? (
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
