"use client";

import { useState } from "react";
import {
  BookUser,
  Brain,
  Clock,
  Ear,
  Eye,
  Footprints,
  Gauge,
  MessageCircle,
  Sparkles,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  Cognition,
  ConversationalStyle,
  GroupSize,
  Mobility,
  ResidentProfile,
  SensoryLevel,
} from "@shared/types";
import { titleCase } from "@/lib/ui";
import SectionHeader from "./ui/SectionHeader";
import BackgroundSection from "./resident/BackgroundSection";

// ============================================================
// Ordered by how staff actually read it, not by where the data came
// from:
//   1. Interests        — what the matcher runs on, and what gets edited
//   2. How they socialize — the preferences that shape a pairing
//   3. What to accommodate — clinical constraints, a checklist not a story
//
// Every field is editable inline. Extraction produces a first draft;
// staff correcting it is the real workflow, and previously only the
// interest chips could be changed at all.
// ============================================================

export default function ProfileCard({
  profile,
  onChange,
  revealedAt,
}: {
  profile: ResidentProfile;
  onChange: (p: ResidentProfile) => void;
  /** When extraction last returned. Drives the one-time reveal. */
  revealedAt?: number | null;
}) {
  const [draft, setDraft] = useState("");

  // Animate only if this mount closely follows an extraction. Subpages
  // remount on every tab click, so without this the whole reveal would
  // replay each time you navigate back — which on the second visit reads
  // as the page being broken.
  const [animate] = useState(
    () => revealedAt != null && Date.now() - revealedAt < 2500
  );
  let order = 0;
  const reveal = () =>
    animate
      ? {
          className: "kw-stagger",
          style: { "--kw-delay": `${order++ * 70}ms` } as React.CSSProperties,
        }
      : {};

  const addInterest = () => {
    const v = draft.trim().toLowerCase();
    if (!v || profile.interests.includes(v)) return setDraft("");
    onChange({ ...profile, interests: [...profile.interests, v] });
    setDraft("");
  };

  const set = (patch: Partial<ResidentProfile>) =>
    onChange({ ...profile, ...patch });

  const care = profile.careNeeds;
  const setCare = (patch: Partial<ResidentProfile["careNeeds"]>) =>
    onChange({ ...profile, careNeeds: { ...care, ...patch } });

  return (
    <div className="kw-rise mt-4 overflow-hidden rounded-2xl border border-accent/25 bg-accent-soft/40">
      <div className="flex items-baseline gap-2.5 border-b border-accent/15 px-6 py-3.5">
        <h3 className="eyebrow text-accent">Profile</h3>
        <span className="text-[11px] text-accent/70">
          extracted — edit anything that looks wrong
        </span>
      </div>

      {/* ---- 1. Interests ---- */}
      <Section icon={Sparkles} title="Interests" hint="drives matching">
        <div className="flex flex-wrap items-center gap-2">
          {profile.interests.map((i, idx) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 rounded-full bg-raised py-1 pr-2 pl-3 text-caption text-ink ring-1 ring-inset ring-accent/20 ${
                animate ? "kw-stagger" : ""
              }`}
              style={
                animate
                  ? ({ "--kw-delay": `${idx * 70}ms` } as React.CSSProperties)
                  : undefined
              }
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
                className="grid h-4 w-4 place-items-center rounded-full text-faint transition hover:bg-high-soft hover:text-high"
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
            className="w-24 rounded-full border border-dashed border-accent/35 bg-transparent px-3 py-1 text-[12.5px] outline-none transition placeholder:text-faint focus:border-accent/70 focus:bg-raised"
          />
        </div>
      </Section>

      {/* ---- 2. History & background ---- */}
      <Section icon={BookUser} title="History & background" hint="who they were before here">
        <BackgroundSection residentId={profile.residentId} />
      </Section>

      {/* ---- 3. Social preferences ---- */}
      <Section icon={Users} title="How they socialize">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field icon={Users} label="Group size" reveal={reveal}>
            <Segmented
              value={profile.socialPreferences.preferredGroupSize}
              options={
                [
                  ["one_on_one", "1-to-1"],
                  ["small", "Small"],
                  ["large", "Large"],
                ] as [GroupSize, string][]
              }
              onChange={(v) => set({ socialPreferences: { preferredGroupSize: v } })}
            />
          </Field>

          <Field icon={Clock} label="Best time of day" reveal={reveal}>
            <Segmented
              value={profile.preferredTimeOfDay}
              options={
                [
                  ["morning", "Morning"],
                  ["afternoon", "Afternoon"],
                  ["evening", "Evening"],
                ] as [NonNullable<ResidentProfile["preferredTimeOfDay"]>, string][]
              }
              onChange={(v) => set({ preferredTimeOfDay: v })}
            />
          </Field>

          <Field icon={MessageCircle} label="Conversation" reveal={reveal}>
            <Segmented
              value={profile.personality.conversationalStyle}
              options={
                [
                  ["quiet", "Quiet"],
                  ["balanced", "Balanced"],
                  ["talkative", "Talkative"],
                ] as [ConversationalStyle, string][]
              }
              onChange={(v) =>
                set({
                  personality: { ...profile.personality, conversationalStyle: v },
                })
              }
            />
          </Field>

          <Field icon={Gauge} label="Social energy" reveal={reveal}>
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-[10.5px] text-faint">
                Reserved
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((1 - profile.personality.introversion) * 100)}
                onChange={(e) =>
                  set({
                    personality: {
                      ...profile.personality,
                      introversion: 1 - Number(e.target.value) / 100,
                    },
                  })
                }
                aria-label="Social energy, reserved to outgoing"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-accent)]"
              />
              <span className="w-14 shrink-0 text-right text-[10.5px] text-faint">
                Outgoing
              </span>
            </div>
          </Field>
        </div>

        {profile.personalityNote && (
          <p className="display mt-5 border-l-2 border-accent/30 pl-4 text-[15px] leading-relaxed text-ink-soft italic">
            {profile.personalityNote}
          </p>
        )}
      </Section>

      {/* ---- 4. Constraints ---- */}
      <Section
        icon={TriangleAlert}
        title="What to accommodate"
        hint="filters activities"
        last
      >
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field icon={Footprints} label="Mobility" inline reveal={reveal}>
            <Picker
              value={care.mobility}
              options={["independent", "cane", "walker", "wheelchair"] as Mobility[]}
              onChange={(v) => setCare({ mobility: v })}
            />
          </Field>
          <Field icon={TriangleAlert} label="Fall risk" inline reveal={reveal}>
            <Picker
              value={care.fallRisk}
              options={["low", "moderate", "high"] as const}
              onChange={(v) => setCare({ fallRisk: v })}
              tone={care.fallRisk === "high" ? "alert" : "default"}
            />
          </Field>
          <Field icon={Brain} label="Cognition" inline reveal={reveal}>
            <Picker
              value={care.cognition}
              options={
                ["intact", "mild_impairment", "moderate_impairment"] as Cognition[]
              }
              onChange={(v) => setCare({ cognition: v })}
            />
          </Field>
          <Field icon={Ear} label="Hearing" inline reveal={reveal}>
            <Picker
              value={care.hearing}
              options={["normal", "mild", "moderate", "severe"] as SensoryLevel[]}
              onChange={(v) => setCare({ hearing: v })}
            />
          </Field>
          <Field icon={Eye} label="Vision" inline reveal={reveal}>
            <Picker
              value={care.vision}
              options={["normal", "mild", "moderate", "severe"] as SensoryLevel[]}
              onChange={(v) => setCare({ vision: v })}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

/* ---------- pieces ---------- */

function Section({
  icon: Icon,
  title,
  hint,
  last = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`px-5 py-5 ${last ? "" : "border-b border-accent/12"}`}>
      <SectionHeader icon={Icon} title={title} hint={hint} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  inline = false,
  reveal,
  children,
}: {
  icon: LucideIcon;
  label: string;
  inline?: boolean;
  reveal?: () => { className?: string; style?: React.CSSProperties };
  children: React.ReactNode;
}) {
  const anim = reveal?.() ?? {};
  if (inline) {
    return (
      <div {...anim} className={`flex items-center gap-2.5 ${anim.className ?? ""}`}>
        <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
        <span className="flex-1 text-[12px] text-ink-soft">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <div {...anim} className={anim.className}>
      <div className="flex items-center gap-2">
        <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
        <span className="text-caption text-muted">{label}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Three-or-fewer options: show them all, one tap to change. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-raised p-0.5 ring-1 ring-inset ring-accent/15">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-[6px] px-2.5 py-1 text-[11.5px] transition ${
            value === v
              ? "bg-accent font-medium text-white"
              : "text-ink-soft hover:bg-accent-soft"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Four-plus options, or a value that's read far more often than changed. */
function Picker<T extends string>({
  value,
  options,
  onChange,
  tone = "default",
}: {
  value: T | undefined;
  options: readonly T[];
  onChange: (v: T) => void;
  tone?: "default" | "alert";
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as T)}
        className={`cursor-pointer appearance-none rounded-md bg-raised py-1 pr-6 pl-2.5 text-[11.5px] ring-1 ring-inset outline-none transition focus:ring-accent/60 ${
          tone === "alert"
            ? "text-high ring-high/30"
            : "text-ink ring-accent/15"
        }`}
      >
        {value === undefined && <option value="">Not recorded</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {titleCase(o)}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] text-faint"
      >
        ▼
      </span>
    </div>
  );
}
