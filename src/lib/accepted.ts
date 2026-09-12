"use client";

import { createStore } from "./localStore";

// ============================================================
// Accepted prescriptions, and the outcomes staff log against them.
//
// The outcome half is §2's stage 5 — the feedback loop the design doc
// says to describe verbally. One tap is cheap enough to actually build,
// and it makes the claim demonstrable instead of promised.
// ============================================================

export interface AcceptedEntry {
  eventId: string;
  residentId: string;
  /** Epoch ms, so "was this today?" is answerable. */
  at: number;
}

export type Outcome = "went_well" | "did_not_happen" | "follow_up";

export interface OutcomeEntry {
  eventId: string;
  residentId: string;
  outcome: Outcome;
  note?: string;
  at: number;
}

const acceptedStore = createStore<AcceptedEntry>("mosaic.accepted.v1");
const outcomeStore = createStore<OutcomeEntry>("mosaic.outcomes.v1");

export const OUTCOME_LABELS: Record<Outcome, string> = {
  went_well: "Went well",
  did_not_happen: "Didn't happen",
  follow_up: "Needs follow-up",
};

/* ---------- accepted ---------- */

export function recordAccepted(eventId: string, residentIds: string[]) {
  const next = [...acceptedStore.read()];
  for (const residentId of residentIds) {
    if (!next.some((e) => e.eventId === eventId && e.residentId === residentId)) {
      next.push({ eventId, residentId, at: Date.now() });
    }
  }
  acceptedStore.write(next);
}

export function removeAccepted(eventId: string, residentId: string) {
  acceptedStore.write(
    acceptedStore
      .read()
      .filter((e) => !(e.eventId === eventId && e.residentId === residentId))
  );
}

export function clearAccepted() {
  acceptedStore.clear();
  outcomeStore.clear();
}

/** Resident ids added to this event during the session. */
export function useAccepted(eventId: string): string[] {
  return acceptedStore
    .useAll()
    .filter((e) => e.eventId === eventId)
    .map((e) => e.residentId);
}

export function useAllAccepted(): AcceptedEntry[] {
  return acceptedStore.useAll();
}

/* ---------- outcomes ---------- */

export function recordOutcome(
  eventId: string,
  residentId: string,
  outcome: Outcome,
  note?: string
) {
  const next = outcomeStore
    .read()
    .filter((e) => !(e.eventId === eventId && e.residentId === residentId));
  next.push({ eventId, residentId, outcome, note, at: Date.now() });
  outcomeStore.write(next);
}

export function useOutcomes(): OutcomeEntry[] {
  return outcomeStore.useAll();
}
