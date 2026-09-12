import type { LucideIcon } from "lucide-react";

const TONES = {
  neutral: "bg-surface text-ink-soft ring-1 ring-inset ring-line",
  accent: "bg-accent-soft text-accent-deep",
  solid: "bg-accent text-white",
  high: "bg-high-soft text-high",
  mid: "bg-mid-soft text-mid",
  low: "bg-low-soft text-low",
} as const;

const SIZES = {
  sm: "px-2 py-0.5 text-micro",
  md: "px-2.5 py-1 text-caption",
} as const;

/** Replaces four near-identical inline Tag components. */
export default function Tag({
  children,
  tone = "neutral",
  size = "md",
  icon: Icon,
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      {Icon && <Icon aria-hidden className="h-3 w-3 shrink-0" strokeWidth={2} />}
      {children}
    </span>
  );
}
