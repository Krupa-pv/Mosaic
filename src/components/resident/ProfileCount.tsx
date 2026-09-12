"use client";

import { useBuiltProfileIds } from "@/lib/builtProfiles";
import Stat from "../ui/Stat";

/** Counts down as profiles get built, rather than staying stuck. */
export default function ProfileCount({ awaiting }: { awaiting: string[] }) {
  const built = useBuiltProfileIds();
  const left = awaiting.filter((id) => !built.has(id)).length;
  return (
    <Stat
      label="Need a profile"
      value={left}
      tone={left > 0 ? "text-mid" : "text-accent"}
    />
  );
}
