import type { User } from '@/types';

/**
 * Colors for the "this house" identity - the Houses overview tile and the Level 1
 * per-house card it opens into (house/[householdId]/_layout.tsx) - as opposed to any
 * fixed-per-feature color (Chat, Files, Tasks, ...) nested inside a house. Every entry
 * differs from DASHBOARD_COLOR ('#2563eb', the Houses overview's own parent card) and
 * from every nested feature-tile color by exact hex value, so a house is never literally
 * the same color as its parent or any of its own children.
 *
 * A few entries were deliberately swapped out after visual testing turned up near-misses
 * that technically passed the "different hex" bar but still read as "the same color" at
 * a glance: a blue (close to the blue parent card right above it), an orange (too close
 * to the fixed orange "Feedback" tile every house's dashboard also shows), and a red and
 * a pink (too close to the fixed red "House"/"Tasks" and pink "Chat"/"View house" tiles
 * sitting right next to a house's own identity color on that same screen) - this isn't an
 * exhaustive guarantee against every nested tile's exact hue for every palette entry
 * (several remaining ones share a hue family, just a visibly different shade, with a
 * nested tile elsewhere on the same screen), just the ones actually confirmed to clash
 * when screenshotted together.
 */
const HOUSE_PALETTE = [
  '#92400e', // brown (amber-800)
  '#7f1d1d', // deep red (red-900) - not red-500/600, too close to House/Tasks' #dc2626
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#a855f7', // purple-500
  '#9d174d', // deep pink (pink-800) - not pink-500/600, too close to Chat/View's #db2777
  '#14b8a6', // teal-500
  '#84cc16', // lime-500
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
];

function hashToIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % mod;
}

/**
 * Assigns each household id a color from HOUSE_PALETTE: a stable hash of the id picks
 * its preferred slot, nudged forward past any slot a lexicographically earlier id in
 * the same list already took - so two houses never render in the same color even if
 * their hashes collide, and the result doesn't depend on the order `householdIds`
 * arrives in (the backend's membership list has no guaranteed order). The search for a
 * free slot is capped at `HOUSE_PALETTE.length` attempts per id, so once a user belongs
 * to more households than the palette has colors, the slots that ran out of room just
 * reuse their hashed slot as-is instead of spinning forever looking for one that isn't
 * there - an accepted limit (repeat colors past ten houses) given how few users will
 * ever hit it, not a crash/hang like an unbounded search would be.
 *
 * Known trade-off: a house's color can shift if the *set* of households it's computed
 * alongside changes (joining/leaving a house can, rarely, nudge an unrelated house into
 * a different slot via the collision-resolution step) - stable per render of a given
 * membership list, not permanently pinned to a household id across every possible list
 * it might ever appear in. Accepted since it only happens on an actual hash collision
 * between specific households, and resolves itself back to normal (no error state).
 */
export function assignHouseColors(householdIds: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  const used = new Set<number>();
  for (const id of [...householdIds].sort()) {
    let slot = hashToIndex(id, HOUSE_PALETTE.length);
    for (let attempts = 0; used.has(slot) && attempts < HOUSE_PALETTE.length; attempts++) {
      slot = (slot + 1) % HOUSE_PALETTE.length;
    }
    used.add(slot);
    colors.set(id, HOUSE_PALETTE[slot]);
  }
  return colors;
}

/**
 * The color to render a specific house's identity in (its Houses overview tile and its
 * Level 1 card, kept in sync since both resolve to the same color for the same
 * user/householdId). Pass the full `user` so the assignment is computed over every house
 * the viewer belongs to - calling this with just one id in isolation would lose the
 * collision check against their other houses. Recomputes the whole assignment on every
 * call, so callers that re-render often (e.g. on every route change within an open
 * house) should wrap this in `useMemo`, and a caller rendering every household at once
 * (the Houses overview) should call `assignHouseColors` directly, once, instead of this
 * per tile.
 */
export function getHouseColor(user: User | null | undefined, householdId: string | undefined): string {
  const ids = user?.households.map((h) => h.householdId) ?? [];
  if (!householdId || ids.length === 0) return HOUSE_PALETTE[0];
  return assignHouseColors(ids).get(householdId) ?? HOUSE_PALETTE[0];
}
