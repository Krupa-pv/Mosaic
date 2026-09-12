"use client";

// ============================================================
// Clear everything the demo writes down.
//
// Profiles you build, notes, tasks, accepted prescriptions, outcomes and
// background edits all persist in the browser — which is right for using
// the product and wrong for rehearsing it. One run leaves Margaret
// profiled, so the next one can't show her being built.
//
// Sign-in is left alone; this resets the data, not the session.
// ============================================================

const DEMO_KEYS = [
  "mosaic.profiles.v2",
  "mosaic.background.v2",
  // Retired keys, cleared too so an old rehearsal can't linger.
  "mosaic.profiles.v1",
  "mosaic.background.v1",
  "mosaic.observations.v1",
  "mosaic.tasks.v1",
  "mosaic.accepted.v1",
  "mosaic.outcomes.v1",
];

export function resetDemoData() {
  try {
    for (const key of DEMO_KEYS) localStorage.removeItem(key);
  } catch {
    /* storage blocked — nothing was stored either */
  }
  // Full reload so every store re-reads from empty.
  window.location.reload();
}
