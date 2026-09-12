"use client";

import { useState } from "react";
import Image from "next/image";
import { photoFor } from "@/lib/photos";
import { initials } from "@/lib/ui";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

// The circle owns its own type size — this is why the old code had
// 9.5px initials, squeezing text into a 28px circle. Sizes here are
// large enough that one step of the type scale always fits.
const SIZES: Record<AvatarSize, { px: number; cls: string; text: string }> = {
  xs: { px: 28, cls: "h-7 w-7", text: "text-micro" },
  sm: { px: 36, cls: "h-9 w-9", text: "text-caption" },
  md: { px: 44, cls: "h-11 w-11", text: "text-body" },
  lg: { px: 56, cls: "h-14 w-14", text: "text-lead" },
  xl: { px: 80, cls: "h-20 w-20", text: "text-title" },
};

const RINGS = {
  paper: "ring-2 ring-paper",
  raised: "ring-2 ring-raised",
  accent: "ring-2 ring-accent",
  none: "",
} as const;

export default function Avatar({
  residentId,
  firstName,
  lastName = "",
  size = "sm",
  ring = "none",
  tone = "neutral",
  /** Stacks overlap their neighbour, which clips a second character. */
  letters = "both",
  className = "",
}: {
  residentId?: string;
  firstName: string;
  lastName?: string;
  size?: AvatarSize;
  ring?: keyof typeof RINGS;
  tone?: "neutral" | "accent";
  letters?: "both" | "first";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size];
  const src = residentId && !failed ? photoFor(residentId) : null;
  const label = `${firstName} ${lastName}`.trim();

  const base = `relative grid shrink-0 place-items-center overflow-hidden rounded-full ${s.cls} ${RINGS[ring]} ${className}`;

  if (src) {
    return (
      <span className={base}>
        <Image
          src={src}
          alt={label}
          width={s.px}
          height={s.px}
          // A missing file must degrade to initials, not a broken image.
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`${base} font-semibold ${s.text} ${
        tone === "accent"
          ? "bg-accent text-white"
          : "bg-line-soft text-ink-soft"
      }`}
      aria-label={label}
      role="img"
    >
      {letters === "first"
        ? firstName[0]?.toUpperCase()
        : initials(firstName, lastName)}
    </span>
  );
}
