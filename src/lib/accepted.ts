"use client";

import { useSyncExternalStore } from "react";

// ============================================================
// Accepted prescriptions, remembered across navigation.
//
// §4 rules out a database, so this is localStorage — enough that
// accepting Margaret into Garden Circle and then opening the Garden
// Circle page shows her on the roster, instead of the demo quietly
// contradicting itself. Every access is guarded: private windows and
// blocked site data must not break the page.
// ============================================================

const KEY = "mosaic.accepted.v1";

export interface AcceptedEntry {
  eventId: string;
  residentId: string;
}

const listeners = new Set<() => void>();
let cache: AcceptedEntry[] = [];
let cacheRaw: string | null = null;

function read(): AcceptedEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    // Cache by raw string so useSyncExternalStore gets a stable reference.
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      cache = raw ? (JSON.parse(raw) as AcceptedEntry[]) : [];
    }
    return cache;
  } catch {
    return [];
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function recordAccepted(eventId: string, residentIds: string[]) {
  try {
    const next = [...read()];
    for (const residentId of residentIds) {
      if (!next.some((e) => e.eventId === eventId && e.residentId === residentId)) {
        next.push({ eventId, residentId });
      }
    }
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the current page still renders correctly from
    // its own state; only cross-page memory is lost.
  }
  emit();
}

export function clearAccepted() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const EMPTY: AcceptedEntry[] = [];

/** Reads as empty during SSR so server and first client render agree. */
export function useAccepted(eventId: string): string[] {
  const all = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY
  );
  return all.filter((e) => e.eventId === eventId).map((e) => e.residentId);
}
