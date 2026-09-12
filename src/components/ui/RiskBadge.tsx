import type { Resident } from "@shared/types";
import { riskTone } from "@/lib/ui";

/** Single source for the Elevated / Watch / Stable pill. */
export default function RiskBadge({
  level,
  size = "sm",
  showScore,
}: {
  level: Resident["riskLevel"];
  size?: "sm" | "md";
  /** When given, renders "82 · Elevated" instead of the label alone. */
  showScore?: number;
}) {
  const tone = riskTone(level);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${tone.badge} ${
        size === "md" ? "px-3 py-1.5 text-caption" : "px-2 py-1 text-micro"
      }`}
    >
      {showScore !== undefined && (
        <span className="font-mono tabular-nums">{showScore}</span>
      )}
      {tone.label}
    </span>
  );
}
