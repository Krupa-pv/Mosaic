"use client";

import { useState } from "react";

/**
 * Emphasis form: one series is the story (this resident, in the risk
 * hue), the rest is context (floor average, in gray). Two series, so a
 * legend is present; the endpoint is the only direct label.
 */
export default function RiskTrajectory({
  values,
  average,
  name,
  color,
}: {
  values: number[];
  average: number[];
  name: string;
  color: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 620;
  const H = 170;
  // Wide enough that the leftmost week tick isn't clipped by the viewBox.
  // Room for the y-axis labels and its title.
  const padL = 54;
  const padR = 36;
  const padT = 26;
  const padB = 44;

  const all = [...values, ...average];
  const min = Math.max(0, Math.min(...all) - 10);
  const max = Math.min(100, Math.max(...all) + 10);
  const span = max - min || 1;

  const x = (i: number) =>
    padL + (i / (values.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);

  const path = (s: number[]) => s.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPath =
    `${values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ")} ` +
    `L${x(values.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;

  const last = values.length - 1;
  const weekLabel = (i: number) =>
    i === last ? "now" : `${last - i}w ago`;

  return (
    <figure className="m-0">
      {/* ---- Legend (two series) ---- */}
      <figcaption className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="mr-auto text-body font-medium text-ink">
          Isolation risk over 6 weeks
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full"
            style={{ background: color }}
          />
          {name}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full bg-faint"
          />
          Floor average
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${name}'s isolation risk over ${values.length} weeks, rising from ${values[0]} to ${values[last]}, against a floor average of ${average[last]}.`}
        onMouseLeave={() => setHover(null)}
      >
        {/* ---- Gridlines with a labelled y-axis ---- */}
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-line-soft)"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={y(v) + 4}
              textAnchor="end"
              fill="var(--color-muted)"
              className="font-mono text-[11px]"
            >
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* ---- Axis lines ---- */}
        <line
          x1={padL}
          x2={padL}
          y1={padT - 6}
          y2={H - padB}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
        <line
          x1={padL}
          x2={W - padR}
          y1={H - padB}
          y2={H - padB}
          stroke="var(--color-line)"
          strokeWidth="1"
        />

        {/* ---- Axis titles ---- */}
        <text
          transform={`translate(14 ${(H - padB + padT) / 2}) rotate(-90)`}
          textAnchor="middle"
          fill="var(--color-muted)"
          className="text-[11px]"
        >
          Isolation risk (0–100)
        </text>
        <text
          x={(padL + W - padR) / 2}
          y={H - 6}
          textAnchor="middle"
          fill="var(--color-muted)"
          className="text-[11px]"
        >
          Week
        </text>

        {/* ---- Context series ---- */}
        <polyline
          points={path(average)}
          fill="none"
          stroke="var(--color-faint)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ---- Story series ---- */}
        <path d={areaPath} fill={color} opacity="0.1" />
        <polyline
          points={path(values)}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ---- Endpoint: the only direct label ---- */}
        <circle
          cx={x(last)}
          cy={y(values[last])}
          r="4.5"
          fill={color}
          stroke="var(--color-raised)"
          strokeWidth="2"
        />
        <text
          x={x(last) + 10}
          y={y(values[last]) + 4}
          fill={color}
          className="font-mono text-[12px] font-medium"
        >
          {values[last]}
        </text>

        {/* ---- Week ticks ---- */}
        {values.map((_, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - padB + 16}
            textAnchor="middle"
            fill="var(--color-faint)"
            className="text-[11px]"
          >
            {weekLabel(i)}
          </text>
        ))}

        {/* ---- Hover layer ---- */}
        {hover !== null && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={H - padB}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <circle
              cx={x(hover)}
              cy={y(values[hover])}
              r="4.5"
              fill={color}
              stroke="var(--color-raised)"
              strokeWidth="2"
            />
            <circle
              cx={x(hover)}
              cy={y(average[hover])}
              r="4"
              fill="var(--color-faint)"
              stroke="var(--color-raised)"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Hit targets wider than the marks */}
        {values.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (W - padL - padR) / (values.length - 1) / 2}
            y={0}
            width={(W - padL - padR) / (values.length - 1)}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* ---- Tooltip as text, so it can't clip out of the SVG ---- */}
      <p className="mt-1 h-4 text-[11px] text-muted">
        {hover !== null && (
          <>
            <span className="text-ink-soft">{weekLabel(hover)}</span> ·{" "}
            {name} <span className="font-mono">{values[hover]}</span> · floor{" "}
            <span className="font-mono">{average[hover]}</span>
          </>
        )}
      </p>
    </figure>
  );
}
