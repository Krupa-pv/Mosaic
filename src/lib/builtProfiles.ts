"use client";

import type { ResidentProfile } from "@shared/types";
import { createStore } from "./localStore";

// ============================================================
// Profiles built in the app.
//
// Extraction used to live only in React state, so a profile you'd just
// built vanished on navigation and the roster went on insisting the
// resident still needed one. Anything built or edited here is written
// down, which is what makes "add a profile" actually change the app.
//
// §4 rules out a database, so this is localStorage — the same store
// everything else session-level uses.
// ============================================================

interface Stored {
  residentId: string;
  profile: ResidentProfile;
  at: number;
}

const store = createStore<Stored>("mosaic.profiles.v1");

export function saveProfile(residentId: string, profile: ResidentProfile) {
  store.write([
    ...store.read().filter((p) => p.residentId !== residentId),
    { residentId, profile, at: Date.now() },
  ]);
}

export function readBuiltProfile(residentId: string): ResidentProfile | null {
  return store.read().find((p) => p.residentId === residentId)?.profile ?? null;
}

/** Ids with a profile built in-app, so the roster can stop flagging them. */
export function useBuiltProfileIds(): Set<string> {
  const all = store.useAll();
  return new Set(all.map((p) => p.residentId));
}

export function useBuiltProfile(residentId: string): ResidentProfile | null {
  const all = store.useAll();
  return all.find((p) => p.residentId === residentId)?.profile ?? null;
}

/** Server-side truth plus anything built here. */
export function useStillAwaiting(
  serverAwaiting: string[]
): (residentId: string) => boolean {
  const built = useBuiltProfileIds();
  return (residentId: string) =>
    serverAwaiting.includes(residentId) && !built.has(residentId);
}
