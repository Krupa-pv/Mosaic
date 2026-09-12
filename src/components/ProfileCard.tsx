"use client";

import { useState } from "react";
import type { ResidentProfile } from "@shared/types";
import { titleCase } from "@/lib/ui";

// The merged profile is editable on purpose: extraction is a first
// draft, and staff correcting it is the realistic workflow.
export default function ProfileCard({
  profile,
  onChange,
}: {
  profile: ResidentProfile;
  onChange: (p: ResidentProfile) => void;
}) {
  const [draft, setDraft] = useState("");

  const addInterest = () => {
    const v = draft.trim().toLowerCase();
    if (!v || profile.interests.includes(v)) return setDraft("");
    onChange({ ...profile, interests: [...profile.interests, v] });
    setDraft("");
  };

  const care = profile.careNeeds;
  const facts: [string, string | undefined][] = [
    ["Mobility", care.mobility && titleCase(care.mobility)],
    ["Fall risk", care.fallRisk && titleCase(care.fallRisk)],
    ["Hearing", care.hearing && titleCase(care.hearing)],
    ["Vision", care.vision && titleCase(care.vision)],
    ["Cognition", care.cognition && titleCase(care.cognition)],
    [
      "Best time",
      profile.preferredTimeOfDay && titleCase(profile.preferredTimeOfDay),
    ],
    [
      "Group size",
      profile.socialPreferences.preferredGroupSize &&
        titleCase(profile.socialPreferences.preferredGroupSize),
    ],
    [
      "Style",
      profile.personality.conversationalStyle &&
        titleCase(profile.personality.conversationalStyle),
    ],
  ];

  return (
    <div className="kw-rise mt-4 overflow-hidden rounded-2xl border border-accent/25 bg-accent-soft/50">
      <div className="flex items-baseline gap-2.5 border-b border-accent/15 px-6 py-3.5">
        <h3 className="eyebrow text-accent">Merged profile</h3>
        <span className="text-[11px] text-accent/70">
          care plan wins on conflict
        </span>
      </div>

      <div className="px-6 py-5">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts
            .filter(([, v]) => Boolean(v))
            .map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1 text-[14px] text-ink">{v}</dd>
              </div>
            ))}
        </dl>

        <div className="mt-6">
          <span className="eyebrow">Interests</span>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {profile.interests.map((i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-[12px] text-ink-soft ring-1 ring-inset ring-accent/15"
              >
                {i}
                <button
                  type="button"
                  aria-label={`Remove ${i}`}
                  onClick={() =>
                    onChange({
                      ...profile,
                      interests: profile.interests.filter((x) => x !== i),
                    })
                  }
                  className="text-faint transition hover:text-high"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addInterest())
              }
              onBlur={addInterest}
              placeholder="+ add"
              className="w-20 rounded-full border border-dashed border-accent/30 bg-transparent px-3 py-1 text-[12px] outline-none transition placeholder:text-faint focus:border-accent/60 focus:bg-raised"
            />
          </div>
        </div>

        {profile.personalityNote && (
          <p className="display mt-6 border-l-2 border-accent/30 pl-4 text-[15px] leading-relaxed text-ink-soft italic">
            {profile.personalityNote}
          </p>
        )}
      </div>
    </div>
  );
}
