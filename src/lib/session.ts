"use client";

import { useSyncExternalStore } from "react";
import { CURRENT_STAFF_ID, staff, type Staff } from "./staff";

// ============================================================
// Who is signed in.
//
// One account per care provider — each caregiver sees their own
// residents, their own shift, and their own end-of-day list. There is no
// real auth in this build; picking an account is the whole sign-in.
// ============================================================

const KEY = "mosaic.session.v1";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function signIn(staffId: string) {
  try {
    localStorage.setItem(KEY, staffId);
  } catch {
    /* storage blocked — the session just won't survive a reload */
  }
  emit();
}

export function signOut() {
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

/** null while signed out; undefined during SSR and first paint. */
export function useSessionId(): string | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export function useCurrentStaff(): Staff | undefined {
  const id = useSessionId();
  if (id === undefined) return undefined;
  return staff.find((s) => s.id === (id ?? CURRENT_STAFF_ID));
}
