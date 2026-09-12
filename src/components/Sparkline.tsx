/**
 * Row-level trend mark. No axes, no labels — it reads as texture in a
 * table, and the score column beside it carries the number.
 */
export default function Sparkline({
  values,
  color,
  width = 88,
  height = 26,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => (i / (values.length - 1)) * (width - pad * 2) + pad;
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - pad * 2);

  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2px surface ring keeps the end dot legible over the line */}
      <circle
        cx={x(last)}
        cy={y(values[last])}
        r="4"
        fill={color}
        stroke="var(--color-raised)"
        strokeWidth="2"
      />
    </svg>
  );
}
