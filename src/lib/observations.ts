"use client";

import { createStore } from "./localStore";

// ============================================================
// Daily notes — what staff observe, day to day.
//
// Distinct from the care plan and the intake note, which are written
// once. An intake note is an admission document; observations are the
// stream that accumulates, and the only source that can tell you a
// resident's interests have changed since admission.
//
// This is what the profile-suggestion pass reads.
// ============================================================

export type Sentiment = "went_well" | "didnt_happen" | "follow_up" | "note";

export interface Observation {
  id: string;
  residentId: string;
  /** Present when the note came from an activity outcome. */
  eventId?: string;
  sentiment: Sentiment;
  text: string;
  at: number;
}

const store = createStore<Observation>("mosaic.observations.v1");

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  went_well: "Went well",
  didnt_happen: "Didn't happen",
  follow_up: "Needs follow-up",
  note: "Observation",
};

export function addObservation(
  o: Omit<Observation, "id" | "at"> & { at?: number }
) {
  store.write([
    ...store.read(),
    {
      ...o,
      id: `${o.residentId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: o.at ?? Date.now(),
    },
  ]);
}

export function removeObservation(id: string) {
  store.write(store.read().filter((o) => o.id !== id));
}

export function useObservations(residentId?: string): Observation[] {
  const all = store.useAll();
  const list = residentId
    ? all.filter((o) => o.residentId === residentId)
    : all;
  return [...list].sort((a, b) => b.at - a.at);
}

/** Non-reactive read, for building a request body. */
export function readObservations(residentId: string): Observation[] {
  return store.read().filter((o) => o.residentId === residentId);
}
