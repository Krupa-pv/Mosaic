"use client";

import { useSyncExternalStore } from "react";

// ============================================================
// A tiny localStorage-backed store.
//
// §4 rules out a database, so session memory lives in the browser.
// Every access is guarded: a private window or blocked site data must
// never break a page, it just means nothing is remembered.
//
// Snapshots are cached by raw string so useSyncExternalStore gets a
// stable reference and doesn't loop.
// ============================================================

export interface Store<T> {
  read(): T[];
  write(next: T[]): void;
  clear(): void;
  useAll(): T[];
}

export function createStore<T>(key: string): Store<T> {
  const listeners = new Set<() => void>();
  const EMPTY: T[] = [];
  let cache: T[] = EMPTY;
  let cacheRaw: string | null = null;

  function read(): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== cacheRaw) {
        cacheRaw = raw;
        cache = raw ? (JSON.parse(raw) as T[]) : EMPTY;
      }
      return cache;
    } catch {
      return EMPTY;
    }
  }

  function emit() {
    listeners.forEach((l) => l());
  }

  function write(next: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable — the current page still renders from its
         own state; only cross-page memory is lost */
    }
    emit();
  }

  function clear() {
    try {
      localStorage.removeItem(key);
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

  return {
    read,
    write,
    clear,
    // Reads as empty during SSR so server and first client render agree.
    useAll: () => useSyncExternalStore(subscribe, read, () => EMPTY),
  };
}
