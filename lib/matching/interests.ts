// Shared interest-similarity helpers, used by both resident matching and
// event matching. The spec calls for embeddings; real embeddings are out of
// scope for this build, so a hand-written affinity map stands in. It covers
// the relationships the spec names explicitly (gardening / flowers /
// horticulture / botanical gardens / nature) plus the ones our catalog needs.

/** Extraction can return "community events" or "community_events". */
export const norm = (s: string) =>
  s.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

const INTEREST_AFFINITY: Record<string, string[]> = {
  gardening: ["nature", "outdoors", "plants", "flowers", "horticulture", "botanical gardens"],
  jazz: ["music", "big band", "singing", "concerts"],
  cooking: ["baking", "food", "recipes"],
  socializing: ["community events", "conversation", "visiting"],
  reading: ["books", "book club", "poetry", "discussion"],
  art: ["painting", "crafts", "drawing"],
  exercise: ["walking", "outdoors", "stretching"],
  games: ["cards", "trivia", "puzzles", "bingo"],
  woodworking: ["crafts", "building"],
  baseball: ["sports", "television"],
  family: ["grandchildren", "children", "visiting"],
};

const AFFINITY_PAIRS: Set<string> = (() => {
  const pairs = new Set<string>();
  for (const [key, related] of Object.entries(INTEREST_AFFINITY)) {
    for (const other of related) pairs.add([norm(key), norm(other)].sort().join("|"));
  }
  return pairs;
})();

export const isRelated = (x: string, y: string) => AFFINITY_PAIRS.has([x, y].sort().join("|"));

/** Exact overlap counts 1.0, a related pair counts 0.5. Each tag is
 *  consumed once, so a single interest cannot be matched twice. */
export function countShared(listA: string[], listB: string[]): number {
  const a = listA.map(norm);
  const b = listB.map(norm);
  const used = new Set<number>();
  let shared = 0;

  // Exact first, so an exact match is never consumed by a weaker affinity one.
  for (const x of a) {
    const i = b.findIndex((y, idx) => !used.has(idx) && y === x);
    if (i !== -1) {
      used.add(i);
      shared += 1;
    }
  }
  for (const x of a) {
    if (b.includes(x)) continue;
    const i = b.findIndex((y, idx) => !used.has(idx) && isRelated(x, y));
    if (i !== -1) {
      used.add(i);
      shared += 0.5;
    }
  }
  return shared;
}

/** Diminishing returns. The first genuinely shared interest does most of the
 *  work; a floor above zero keeps "nothing in common" weak, not disqualifying. */
export function saturate(amount: number, k = 1.4, floor = 12): number {
  return floor + (100 - floor) * (1 - Math.exp(-k * amount));
}
