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
import { allResidents, findResident } from "@/lib/roster";
import { buildConnections } from "@/lib/connections";
import { HEX, riskHex } from "@/lib/ui";

interface Node extends SimulationNodeDatum {
  id: string;
  contact: number;
  level: "low" | "moderate" | "high";
}
type Link = SimulationLinkDatum<Node> & { times: number };

const W = 760;
const H = 520;
const px = (n: number | undefined) => Math.round((n ?? 0) * 100) / 100;

/**
 * Who has actually spent time together this week.
 *
 * The more sessions two residents have shared, the shorter and heavier
 * the thread between them, so the cluster in the middle is the floor's
 * social core and anyone drifting at the edge is genuinely not seeing
 * people — which is the thing worth acting on.
 *
 * Layout is deterministic: seeded starting positions, ticked to rest
 * before first paint, so it looks the same on every load.
 */
export default function RecentConnections({
  onSelect,
  compact = false,
}: {
  onSelect?: (residentId: string) => void;
  compact?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const graph = useMemo(() => buildConnections(), []);

  const { nodes, links, sim } = useMemo(() => {
    const nodes: Node[] = allResidents.map((r, i, arr) => {
      const angle = (i / arr.length) * Math.PI * 2;
      return {
        id: r.id,
        contact: graph.contact[r.id] ?? 0,
        level: r.riskLevel,
        x: W / 2 + Math.cos(angle) * 200,
        y: H / 2 + Math.sin(angle) * 160,
      };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: Link[] = graph.connections
      .map((c) => ({
        source: byId.get(c.a)!,
        target: byId.get(c.b)!,
        times: c.times,
      }))
      .filter((l) => l.source && l.target);

    const most = Math.max(1, ...links.map((l) => l.times));

    const sim: Simulation<Node, Link> = forceSimulation(nodes)
      .force(
        "link",
        forceLink<Node, Link>(links)
          .id((d) => d.id)
          // More time together pulls them closer.
          .distance((l) => 230 - (l.times / most) * 170)
          .strength((l) => 0.15 + (l.times / most) * 0.7)
      )
      .force("charge", forceManyBody<Node>().strength(-460))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<Node>().radius((d) => radius(d) + 14))
      .stop();

    sim.tick(340);
    // Someone with a single weak link gets flung outside the frame by
    // the charge force — which is exactly the resident you most need to
    // see. Keep everyone inside the viewBox.
    clamp(nodes);
    return { nodes, links, sim, most };
  }, [graph]);

  function onMove(e: React.MouseEvent) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const n = nodes.find((x) => x.id === dragging);
    if (!n) return;
    n.fx = ((e.clientX - rect.left) / rect.width) * W;
    n.fy = ((e.clientY - rect.top) / rect.height) * H;
    sim.tick(1);
    clamp(nodes);
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

  const most = Math.max(1, ...links.map((l) => l.times));

  return (
    <figure className="m-0 overflow-hidden rounded-2xl border border-line bg-raised">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Who has spent time together in the last ${graph.windowDays} days. Residents who share more sessions sit closer together; those at the edge have had little contact.`}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {links.map((l, i) => {
          const s = l.source as Node;
          const t = l.target as Node;
          const lit = hover !== null && (s.id === hover || t.id === hover);
          return (
            <line
              key={i}
              x1={px(s.x)}
              y1={px(s.y)}
              x2={px(t.x)}
              y2={px(t.y)}
              stroke={lit ? HEX.accentBright : HEX.accent}
              strokeOpacity={hover && !lit ? 0.1 : lit ? 0.95 : 0.3}
              strokeWidth={1 + (l.times / most) * 5}
              strokeLinecap="round"
            />
          );
        })}

        {nodes.map((n) => {
          const r = findResident(n.id);
          const alone = n.contact <= 1;
          const lit = hover === null || hover === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${px(n.x)} ${px(n.y)})`}
              className="cursor-pointer"
              opacity={lit ? 1 : 0.35}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onMouseDown={() => {
                setDragging(n.id);
                sim.alphaTarget(0.25).restart();
              }}
              onClick={() => onSelect?.(n.id)}
            >
              {alone && (
                <circle
                  r={radius(n) + 8}
                  fill="none"
                  stroke={HEX.high}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              )}
              <circle
                r={radius(n)}
                fill={riskHex(n.level)}
                stroke={HEX.raised}
                strokeWidth={3}
              />
              <text
                y={radius(n) + 16}
                textAnchor="middle"
                className="text-[12px]"
                fill={HEX.accentDeep}
              >
                {r?.firstName}
              </text>
              <text
                y={-radius(n) - 8}
                textAnchor="middle"
                className="text-[11px]"
                fill={alone ? HEX.high : HEX.faint}
              >
                {n.contact === 0
                  ? "no contact"
                  : `${n.contact} session${n.contact === 1 ? "" : "s"}`}
              </text>
            </g>
          );
        })}
      </svg>

      {!compact && (
        <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line-soft px-5 py-3 text-micro text-muted">
          <span>Closer together = more time shared</span>
          <span>Thread weight = sessions in common</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-high" />
            Little or no contact
          </span>
          <span className="ml-auto">Drag anyone to explore</span>
        </figcaption>
      )}
    </figure>
  );
}

function clamp(nodes: Node[]) {
  const m = 46;
  for (const n of nodes) {
    n.x = Math.max(m, Math.min(W - m, n.x ?? W / 2));
    n.y = Math.max(m + 10, Math.min(H - m, n.y ?? H / 2));
  }
}

function radius(n: Node) {
  // Size is contact, not risk — the small dots are the lonely ones.
  return 10 + Math.min(n.contact, 14) * 1.1;
}
