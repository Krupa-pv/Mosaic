import type { LucideIcon } from "lucide-react";

/**
 * The one section marker used across every page.
 *
 * Previously sections were a hairline rule and 11px small-caps, which
 * gave the eye nothing to land on — you had to read the page to find
 * your place in it. A solid bar is scannable at a glance and makes the
 * structure obvious while moving between screens.
 */
export default function SectionHeader({
  icon: Icon,
  title,
  hint,
  tone = "dark",
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  /** Right-aligned count or aside — "3 residents", "8 activities". */
  hint?: string;
  tone?: "dark" | "alert";
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 ${
        tone === "alert" ? "bg-high text-white" : "bg-accent-deep text-white"
      } ${className}`}
    >
      {Icon && (
        <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <h2 className="text-caption font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {hint && (
        <span className="ml-auto text-micro text-white/70">{hint}</span>
      )}
    </div>
  );
}
