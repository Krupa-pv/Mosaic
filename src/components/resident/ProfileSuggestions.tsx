"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Plus, X } from "lucide-react";
import type { ResidentProfile } from "@shared/types";
import type { ProfileSuggestion } from "../../../lib/ai/suggest-profile";
import { useObservations } from "@/lib/observations";
import SectionHeader from "../ui/SectionHeader";

/**
 * "You've mentioned gardening in four notes — add it to her interests?"
 *
 * Reads the accumulated daily notes and proposes amendments. Detection
 * is deterministic counting on the server, so this works with no model
 * available; the model only rewrites the reason into something a nurse
 * would say.
 *
 * Nothing is applied automatically. A profile that edits itself behind
 * staff is a profile they stop trusting.
 */
export default function ProfileSuggestions({
  residentId,
  profile,
  onApply,
}: {
  residentId: string;
  profile: ResidentProfile;
  onApply: (p: ResidentProfile) => void;
}) {
  const notes = useObservations(residentId);
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fingerprint = notes.map((n) => n.id).join(",");

  useEffect(() => {
    let cancelled = false;
    if (notes.length === 0) {
      // Clear asynchronously: setState directly in an effect body cascades.
      Promise.resolve().then(() => {
        if (!cancelled) setSuggestions([]);
      });
      return () => {
        cancelled = true;
      };
    }
    fetch("/api/profile/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        notes: notes.map((n) => ({ text: n.text, sentiment: n.sentiment })),
      }),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((s: ProfileSuggestion[]) => {
        if (!cancelled) setSuggestions(Array.isArray(s) ? s : []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
    // Re-run when the notes change, not on every profile keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, residentId]);

  const open = suggestions.filter((s) => !dismissed.has(key(s)));
  if (open.length === 0) return null;

  function apply(s: ProfileSuggestion) {
    if (s.kind === "interest") {
      onApply({ ...profile, interests: [...profile.interests, s.value] });
    } else if (s.kind === "groupSize") {
      onApply({
        ...profile,
        socialPreferences: {
          ...profile.socialPreferences,
          preferredGroupSize: s.value as ResidentProfile["socialPreferences"]["preferredGroupSize"],
        },
      });
    } else if (s.kind === "timeOfDay") {
      onApply({
        ...profile,
        preferredTimeOfDay: s.value as ResidentProfile["preferredTimeOfDay"],
      });
    } else {
      onApply({
        ...profile,
        personality: {
          ...profile.personality,
          conversationalStyle:
            s.value as ResidentProfile["personality"]["conversationalStyle"],
        },
      });
    }
    setDismissed((d) => new Set(d).add(key(s)));
  }

  return (
    <section className="kw-rise mt-6">
      <SectionHeader
        icon={Lightbulb}
        title="Suggested from daily notes"
        hint={`${open.length} to review`}
      />
      <ul className="mt-3 space-y-2">
        {open.map((s) => (
          <li
            key={key(s)}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft/40 px-5 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-body text-ink">
                {s.kind === "interest" ? (
                  <>
                    Add <strong className="font-medium">{s.value}</strong> to
                    their interests?
                  </>
                ) : s.kind === "groupSize" ? (
                  <>Change their preferred group size to one-to-one?</>
                ) : (
                  <>
                    Update {s.kind} to{" "}
                    <strong className="font-medium">{s.value}</strong>?
                  </>
                )}
              </p>
              <p className="mt-0.5 text-caption text-muted">{s.reason}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => apply(s)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-caption font-medium text-white transition hover:bg-accent-deep"
              >
                <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setDismissed((d) => new Set(d).add(key(s)))}
                className="grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-line-soft hover:text-ink"
              >
                <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function key(s: ProfileSuggestion) {
  return `${s.kind}:${s.value}`;
}
