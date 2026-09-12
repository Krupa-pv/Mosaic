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

const ids = [
  "margaret",
  "helen",
  "robert",
  "dorothy",
  "arthur",
  "frances",
  "beatrice",
  "walter",
  "yolanda",
  "samuel",
  "irene",
] as const;

/** Files present in public/residents/. Remove an id to force initials. */
const present = new Set<string>(ids);

export function photoFor(residentId: string): string | null {
  return present.has(residentId) ? `/residents/${residentId}.jpg` : null;
}
