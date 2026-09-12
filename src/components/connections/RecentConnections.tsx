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
import { useAllAccepted } from "@/lib/accepted";
import { photoFor } from "@/lib/photos";
import { HEX, initials } from "@/lib/ui";

interface Node extends SimulationNodeDatum {
  id: string;
  contact: number;
}
type Link = SimulationLinkDatum<Node> & { times: number };

const W = 760;
const H = 520;
const R = 26; // Every face the same size.
const px = (n: number | undefined) => Math.round((n ?? 0) * 100) / 100;

/**
 * Who has actually spent time together this week.
 *
 * One variable, deliberately: distance. Everyone is the same size and
 * every thread is the same weight, so the only thing the picture encodes
 * is how often two residents have chosen to be in the same room. The
 * cluster is the floor's social core; whoever sits outside it is the
 * person to do something about.
 *
 * Earlier versions also varied dot size, dot colour and edge thickness —
 * four channels saying overlapping things, which made it a puzzle rather
 * than a glance.
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

  // Re-derives whenever something is scheduled, so a newly placed
  // resident stops being an outlier the moment you act.
  const accepted = useAllAccepted();
  const graph = useMemo(() => buildConnections(accepted), [accepted]);

  const { nodes, links, sim } = useMemo(() => {
    const nodes: Node[] = allResidents.map((r, i, arr) => {
      const angle = (i / arr.length) * Math.PI * 2;
      return {
        id: r.id,
        contact: graph.contact[r.id] ?? 0,
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
          // The only encoding: more time together, closer together.
          .distance((l) => 250 - (l.times / most) * 185)
          .strength((l) => 0.1 + (l.times / most) * 0.8)
      )
      .force("charge", forceManyBody<Node>().strength(-560))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<Node>().radius(R + 14))
      .stop();

    sim.tick(340);
    clamp(nodes);
    return { nodes, links, sim };
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

  return (
    <figure className="m-0 overflow-hidden rounded-2xl border border-line bg-raised">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Who has spent time together in the last ${graph.windowDays} days. Residents who share more sessions are drawn closer together; anyone outside the cluster has had little contact.`}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        <defs>
          {nodes.map((n) => {
            const src = photoFor(n.id);
            return src ? (
              <clipPath key={n.id} id={`clip-${n.id}`}>
                <circle r={R} cx={0} cy={0} />
              </clipPath>
            ) : null;
          })}
        </defs>

        {/* One weight for every thread. */}
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
              stroke={lit ? HEX.accent : HEX.line}
              strokeOpacity={hover && !lit ? 0.25 : 1}
              strokeWidth={lit ? 2 : 1.5}
              strokeLinecap="round"
            />
          );
        })}

        {nodes.map((n) => {
          const r = findResident(n.id);
          const alone = n.contact <= 1;
          const lit = hover === null || hover === n.id;
          const src = photoFor(n.id);

          return (
            <g
              key={n.id}
              transform={`translate(${px(n.x)} ${px(n.y)})`}
              className="cursor-pointer"
              opacity={lit ? 1 : 0.4}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onMouseDown={() => {
                setDragging(n.id);
                sim.alphaTarget(0.25).restart();
              }}
              onClick={() => onSelect?.(n.id)}
            >
              {src ? (
                <image
                  href={src}
                  x={-R}
                  y={-R}
                  width={R * 2}
                  height={R * 2}
                  clipPath={`url(#clip-${n.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <>
                  <circle r={R} fill={HEX.lineSoft} />
                  <text
                    textAnchor="middle"
                    dy="5"
                    className="text-[14px] font-semibold"
                    fill={HEX.accentDeep}
                  >
                    {r ? initials(r.firstName, r.lastName) : "?"}
                  </text>
                </>
              )}

              {/* Ring: plain by default, dashed alert when barely seen. */}
              <circle
                r={R}
                fill="none"
                stroke={alone ? HEX.high : HEX.raised}
                strokeWidth={3}
                strokeDasharray={alone ? "4 3" : undefined}
              />

              <text
                y={R + 18}
                textAnchor="middle"
                className="text-[13px]"
                fill={alone ? HEX.high : HEX.accentDeep}
              >
                {r?.firstName}
              </text>
            </g>
          );
        })}
      </svg>

      {!compact && (
        <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line-soft px-5 py-3 text-caption text-muted">
          <span>
            <strong className="font-medium text-ink">Closer together</strong> =
            more time spent with each other
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-dashed border-high" />
            Barely saw anyone
          </span>
          <span className="ml-auto">Drag anyone to explore</span>
        </figcaption>
      )}
    </figure>
  );
}

function clamp(nodes: Node[]) {
  const m = R + 24;
  for (const n of nodes) {
    n.x = Math.max(m, Math.min(W - m, n.x ?? W / 2));
    n.y = Math.max(m, Math.min(H - m - 10, n.y ?? H / 2));
  }
}
