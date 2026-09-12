// ============================================================
// Resident photographs.
//
// `types.ts` is the locked cross-dev contract, so `Resident` can't gain
// a photo field — the mapping lives here instead.
//
// Drop files at public/residents/<id>.jpg. Anything missing simply
// falls back to initials, so a half-filled folder never breaks a page.
//
// Sourcing: these residents carry fabricated clinical data (fall risk,
// cognitive impairment). Most stock licences exclude depicting an
// identifiable person as having a health condition, so photorealistic
// generated portraits are the intended fill.
// ============================================================

// Add an id here once public/residents/<id>.jpg actually exists.
//
// This list is explicit rather than optimistic on purpose: claiming a
// photo that isn't there makes next/image 404 on the server for every
// avatar, and the client-side swap to initials then lands during
// hydration and trips a mismatch warning.
//
// Valid ids: margaret, helen, robert, dorothy, arthur, frances,
// beatrice, walter, yolanda, samuel, irene.
const present = new Set<string>([]);

export function photoFor(residentId: string): string | null {
  return present.has(residentId) ? `/residents/${residentId}.jpg` : null;
}
