"use client";

import { createStore } from "./localStore";
import type { InterventionKind } from "./interventions";

// ============================================================
// An intervention someone has taken on.
//
// The gap this closes: a suggestion nobody owns is a suggestion nobody
// does. Taking one on puts it on that caregiver's Today list, and
// completing it writes an observation — which is what later feeds
// profile suggestions.
// ============================================================

export interface Task {
  id: string;
  residentId: string;
  staffId: string;
  kind: InterventionKind;
  title: string;
  because: string;
  createdAt: number;
  doneAt?: number;
}

const store = createStore<Task>("mosaic.tasks.v1");

export function addTask(t: Omit<Task, "id" | "createdAt">) {
  const existing = store.read();
  // One open task per resident per kind — taking it on twice is noise.
  if (
    existing.some(
      (x) => x.residentId === t.residentId && x.kind === t.kind && !x.doneAt
    )
  ) {
    return;
  }
  store.write([
    ...existing,
    { ...t, id: `${t.residentId}-${t.kind}-${Date.now()}`, createdAt: Date.now() },
  ]);
}

export function completeTask(id: string) {
  store.write(
    store.read().map((t) => (t.id === id ? { ...t, doneAt: Date.now() } : t))
  );
}

export function removeTask(id: string) {
  store.write(store.read().filter((t) => t.id !== id));
}

export function useTasks(opts: { staffId?: string; residentId?: string } = {}) {
  const all = store.useAll();
  return all.filter(
    (t) =>
      (!opts.staffId || t.staffId === opts.staffId) &&
      (!opts.residentId || t.residentId === opts.residentId)
  );
}
