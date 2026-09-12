import Link from "next/link";
import { Users } from "lucide-react";
import { admissionNote, allResidents, historyFor } from "@/lib/roster";
import { awaitingProfile } from "../../../lib/profiles";
import AwaitingProfiles from "@/components/resident/AwaitingProfiles";
import ProfileCount from "@/components/resident/ProfileCount";
import { riskHex, trendLabel } from "@/lib/ui";
import Sparkline from "@/components/Sparkline";
import Avatar from "@/components/ui/Avatar";
import PageContainer from "@/components/ui/PageContainer";
import RiskBadge from "@/components/ui/RiskBadge";
import SectionHeader from "@/components/ui/SectionHeader";
import Stat from "@/components/ui/Stat";

export default function RosterPage() {
  const sorted = [...allResidents].sort((a, b) => b.riskScore - a.riskScore);
  const flagged = sorted.filter((r) => r.riskLevel === "high");
  const needProfile = sorted.filter((r) => awaitingProfile(r.id));

  return (
    <PageContainer>
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="eyebrow">Floor 2</p>
          <h1 className="display mt-2 text-headline text-ink">
            Everyone on the floor
          </h1>
          <p className="mt-2 max-w-prose text-caption text-muted">
            Ranked by isolation risk. The line shows six weeks of movement.
          </p>
        </div>
        <dl className="flex gap-8">
          <Stat label="Residents" value={allResidents.length} />
          <Stat label="Elevated" value={flagged.length} tone="text-high" />
          <ProfileCount awaiting={needProfile.map((r) => r.id)} />
        </dl>
      </header>

      <AwaitingProfiles
        residents={sorted}
        serverAwaiting={needProfile.map((r) => r.id)}
      />

      <div className="mt-10">
        <SectionHeader
          icon={Users}
          title="Roster"
          hint="Ranked by isolation risk"
        />

        <ul className="mt-2">
          {sorted.map((r) => (
            <li key={r.id} className="border-b border-line-soft">
              <Link
                href={`/residents/${r.id}`}
                className="group flex items-center gap-4 py-3.5 transition"
              >
                <Avatar
                  residentId={r.id}
                  firstName={r.firstName}
                  lastName={r.lastName}
                  size="sm"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-ink transition group-hover:text-accent-deep">
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="block text-caption text-muted">
                    Room {r.roomNumber}
                    {admissionNote(r.id) && (
                      <span className="ml-2 rounded-full bg-mid-soft px-2 py-0.5 text-micro font-medium text-mid">
                        New
                      </span>
                    )}
                  </span>
                </span>

                <span className="hidden w-28 text-right text-caption text-muted sm:block">
                  {trendLabel(r.riskTrend)}
                </span>

                <span className="hidden sm:block">
                  <Sparkline
                    values={historyFor(r.id)}
                    color={riskHex(r.riskLevel)}
                  />
                </span>

                <span className="w-10 text-right font-mono text-body tabular-nums text-ink">
                  {r.riskScore}
                </span>

                <span className="w-[74px] shrink-0 text-right">
                  <RiskBadge level={r.riskLevel} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}
