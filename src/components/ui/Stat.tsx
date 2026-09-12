export default function Stat({
  label,
  value,
  tone = "text-ink",
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  size?: "md" | "lg";
}) {
  return (
    <div>
      <dd
        className={`display leading-none tabular-nums ${tone} ${
          size === "lg" ? "text-headline" : "text-title"
        }`}
      >
        {value}
      </dd>
      <dt className="eyebrow mt-1.5">{label}</dt>
    </div>
  );
}
