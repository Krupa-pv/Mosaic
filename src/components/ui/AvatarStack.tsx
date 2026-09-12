import { findResident } from "@/lib/roster";
import Avatar, { type AvatarSize } from "./Avatar";

export default function AvatarStack({
  residentIds,
  max = 4,
  size = "xs",
  ring = "paper",
}: {
  residentIds: string[];
  max?: number;
  size?: AvatarSize;
  ring?: "paper" | "raised";
}) {
  const shown = residentIds.slice(0, max);
  const extra = residentIds.length - shown.length;

  return (
    <span className="flex items-center">
      {shown.map((id, i) => {
        const r = findResident(id);
        if (!r) return null;
        return (
          <span key={id} className={i > 0 ? "-ml-2" : ""}>
            <Avatar
              residentId={id}
              firstName={r.firstName}
              lastName={r.lastName}
              size={size}
              ring={ring}
            />
          </span>
        );
      })}
      {extra > 0 && (
        <span
          aria-label={`${extra} more`}
          className={`-ml-2 grid h-7 w-7 place-items-center rounded-full bg-line text-micro font-medium text-muted ring-2 ${
            ring === "paper" ? "ring-paper" : "ring-raised"
          }`}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
