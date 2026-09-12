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
    ["Best time of day", profile.preferredTimeOfDay && titleCase(profile.preferredTimeOfDay)],
    [
      "Group size",
      profile.socialPreferences.preferredGroupSize &&
        titleCase(profile.socialPreferences.preferredGroupSize),
    ],
    [
      "Conversational style",
      profile.personality.conversationalStyle &&
        titleCase(profile.personality.conversationalStyle),
    ],
  ];

  return (
    <div className="kw-rise mt-4 rounded-xl border border-teal-200 bg-teal-50/40 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-800">
        Merged profile
        <span className="ml-2 font-normal normal-case tracking-normal text-teal-700/70">
          care plan wins on conflict
        </span>
      </h3>

      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts
          .filter(([, v]) => Boolean(v))
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wide text-stone-500">
                {k}
              </dt>
              <dd className="text-sm font-medium text-stone-800">{v}</dd>
            </div>
          ))}
      </dl>

      <div className="mt-5">
        <span className="text-[11px] uppercase tracking-wide text-stone-500">
          Interests
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {profile.interests.map((i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700 ring-1 ring-inset ring-stone-200"
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
                className="text-stone-400 transition hover:text-rose-600"
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
            onBlur={addInterest}
            placeholder="+ add"
            className="w-24 rounded-full bg-white px-3 py-1 text-xs outline-none ring-1 ring-inset ring-dashed ring-stone-300 focus:ring-teal-400"
          />
        </div>
      </div>

      {profile.personalityNote && (
        <p className="mt-5 border-l-2 border-teal-300 pl-3 text-sm italic text-stone-600">
          {profile.personalityNote}
        </p>
      )}
    </div>
  );
}
