"use client";

import { createStore } from "./localStore";

// ============================================================
// Life history — the part of a resident that isn't clinical.
//
// types.ts is the locked cross-dev contract, so ResidentProfile can't
// grow fields; this sits alongside it. Seeded values below are the
// starting point, and any staff edit is stored over the top.
//
// Short labelled facts on purpose. "Taught 4th grade for 31 years" is
// something a caregiver can open a conversation with; a paragraph of
// admission prose is not.
// ============================================================

export interface Background {
  from?: string;
  career?: string;
  family?: string;
  routines?: string;
  /** Things worth knowing that don't fit the fields above. */
  notes?: string;
}

export const BACKGROUND_FIELDS: {
  key: keyof Background;
  label: string;
  placeholder: string;
}[] = [
  { key: "from", label: "From", placeholder: "Where they grew up or lived" },
  { key: "career", label: "Work", placeholder: "What they did for a living" },
  { key: "family", label: "Family", placeholder: "Who visits, who they talk about" },
  { key: "routines", label: "Routines", placeholder: "How they like the day to go" },
  { key: "notes", label: "Worth knowing", placeholder: "Anything else" },
];

const seeded: Record<string, Background> = {
  margaret: {
    from: "Sacramento, California",
    career: "Taught fourth grade for 31 years",
    family: "Daughter Anne visits Sundays · three grandchildren",
    routines: "Up early; reads the paper before breakfast",
    notes: "Kept an allotment for decades — grew tomatoes and dahlias",
  },
  helen: {
    from: "Chicago, Illinois",
    career: "Ran a florist's shop with her husband",
    family: "Son Michael calls most evenings",
    routines: "Walks the courtyard before breakfast, whatever the weather",
    notes: "Knows everyone on the floor by name",
  },
  dorothy: {
    from: "Milwaukee, Wisconsin",
    career: "Church organist and piano teacher",
    family: "No family nearby",
    routines: "Listens to the radio in the afternoons",
  },
  robert: {
    from: "Detroit, Michigan",
    career: "Line foreman at the Rouge plant",
    family: "Two sons, both out of state",
    routines: "Watches the ball game if it's on",
  },
};

interface Stored extends Background {
  residentId: string;
}

const store = createStore<Stored>("mosaic.background.v1");

export function useBackground(residentId: string): Background {
  const all = store.useAll();
  const override = all.find((b) => b.residentId === residentId);
  return { ...(seeded[residentId] ?? {}), ...(override ?? {}) };
}

export function readBackground(residentId: string): Background {
  const override = store.read().find((b) => b.residentId === residentId);
  return { ...(seeded[residentId] ?? {}), ...(override ?? {}) };
}

export function setBackgroundField(
  residentId: string,
  key: keyof Background,
  value: string
) {
  const current = readBackground(residentId);
  const next = { ...current, residentId, [key]: value.trim() || undefined };
  store.write([
    ...store.read().filter((b) => b.residentId !== residentId),
    next,
  ]);
}
