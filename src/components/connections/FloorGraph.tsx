"use client";

import { useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { FloorGraph as Graph } from "../../../lib/graph";
import { allResidents, findResident } from "@/lib/roster";
import { riskHex, HEX } from "@/lib/ui";

interface Node extends SimulationNodeDatum {
  id: string;
  score: number;
  level: "low" | "moderate" | "high";
  degree: number;
}
type Link = SimulationLinkDatum<Node> & { score: number };

const W = 760;
const H = 520;

// The simulation runs on both server and client, and 320 ticks of float
// accumulation diverge in the last couple of decimal places — visually
// identical, but enough for React to report a hydration mismatch.
// Rounding at render makes both sides emit the same string.
const px = (n: number | undefined) => Math.round((n ?? 0) * 100) / 100;

/**
 * Force-directed view of the floor. Well-matched residents pull
 * together; the isolated ones drift to the edge with few threads — the
 * product's thesis as a picture.
 *
 * The layout is DETERMINISTIC: nodes start on a seeded circle and the
 * simulation is ticked to rest synchronously before first paint, so the
 * same picture appears on every load and a re-take of the recording
 * can't produce a different one. Physics stays live for dragging.
 */
export default function FloorGraph({
  graph,
  onSelect,
}: {
  graph: Graph;
  onSelect: (residentId: string) => void;
}) {
  const [, setTick] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, links, sim } = useMemo(() => {
    const nodes: Node[] = allResidents.map((r, i, arr) => {
      const angle = (i / arr.length) * Math.PI * 2;
      const g = graph.nodes.find((n) => n.residentId === r.id);
      return {
        id: r.id,
        score: r.riskScore,
        level: r.riskLevel,
        degree: g?.degree ?? 0,
        // Seeded start: no randomness anywhere in this layout.
        x: W / 2 + Math.cos(angle) * 190,
        y: H / 2 + Math.sin(angle) * 150,
      };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: Link[] = graph.edges
      .filter((e) => !e.blockedBy && e.score >= graph.threshold)
      .map((e) => ({
        source: byId.get(e.a)!,
        target: byId.get(e.b)!,
        score: e.score,
      }))
      .filter((l) => l.source && l.target);

    const sim: Simulation<Node, Link> = forceSimulation(nodes)
      .force(
        "link",
        forceLink<Node, Link>(links)
          .id((d) => d.id)
          // Stronger matches sit closer together.
          .distance((l) => 260 - l.score * 1.6)
          .strength((l) => (l.score - graph.threshold) / 120)
      )
      .force("charge", forceManyBody<Node>().strength(-420))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<Node>().radius((d) => radius(d) + 12))
      .stop();

    // Settle before first paint rather than animating into place.
    sim.tick(320);
    return { nodes, links, sim };
  }, [graph]);

  function startDrag(id: string) {
    setDragging(id);
    sim.alphaTarget(0.25).restart();
  }

  function onMove(e: React.MouseEvent) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const n = nodes.find((x) => x.id === dragging);
    if (!n) return;
    n.fx = ((e.clientX - rect.left) / rect.width) * W;
    n.fy = ((e.clientY - rect.top) / rect.height) * H;
    sim.tick(1);
    setTick((t) => t + 1);
  }

  function endDrag() {
    const n = nodes.find((x) => x.id === dragging);
    if (n) {
      n.fx = null;
      n.fy = null;
    }
    sim.alphaTarget(0);
    setDragging(null);
  }

  return (
    <figure className="m-0 overflow-hidden rounded-2xl border border-line bg-raised">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="Compatibility between every resident on the floor. Node size shows isolation risk; a thread is drawn between residents whose compatibility clears the threshold."
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {links.map((l, i) => {
          const s = l.source as Node;
          const t = l.target as Node;
          const lit =
            hover !== null && (s.id === hover || t.id === hover);
          return (
            <line
              key={i}
              x1={px(s.x)}
              y1={px(s.y)}
              x2={px(t.x)}
              y2={px(t.y)}
              stroke={lit ? HEX.accentBright : HEX.accent}
              strokeOpacity={hover && !lit ? 0.12 : lit ? 0.95 : 0.28}
              strokeWidth={1 + ((l.score - graph.threshold) / 32) * 3.2}
              strokeLinecap="round"
            />
          );
        })}

        {nodes.map((n) => {
          const r = findResident(n.id);
          const lit = hover === null || hover === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${px(n.x)} ${px(n.y)})`}
              className="cursor-pointer"
              opacity={lit ? 1 : 0.4}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onMouseDown={() => startDrag(n.id)}
              onClick={() => onSelect(n.id)}
            >
              <circle
                r={radius(n)}
                fill={riskHex(n.level)}
                stroke={HEX.raised}
                strokeWidth={3}
              />
              <text
                y={radius(n) + 15}
                textAnchor="middle"
                className="text-[11px]"
                fill={HEX.accentDeep}
              >
                {r?.firstName}
              </text>
              {n.degree <= 5 && (
                <text
                  y={-radius(n) - 8}
                  textAnchor="middle"
                  className="text-[9px]"
                  fill={riskHex(n.level)}
                >
                  {n.degree} links
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line-soft px-5 py-3 text-micro text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-high" /> Elevated risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-mid" /> Watch
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-low" /> Stable
        </span>
        <span>Circle size = isolation risk · thread thickness = compatibility</span>
        <span className="ml-auto">Drag anyone to explore</span>
      </figcaption>
    </figure>
  );
}

function radius(n: Node) {
  return 9 + (n.score / 100) * 15;
}
