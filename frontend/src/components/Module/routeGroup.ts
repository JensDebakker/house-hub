// Matches "/house/..." or "/screensaver/..." - the two route groups whose first
// client-side entry (from somewhere outside that group entirely) needs navigateToHref.
// Group 1: which one ("house" or "screensaver").
//
// This is intentionally a GROUP match, not a dynamic-segment-id match: an earlier version
// of this check only special-cased entries into `[householdId]` specifically (treating
// house/create.tsx and house/join.tsx, which at the time lived under house/ despite having
// no household id of their own, as always safe for a plain push). Confirmed via Playwright
// that was wrong - tapping "Create house" from the Houses overview with a plain
// `router.push('/house/create')` got stuck exactly the same way `/house/[householdId]/...`
// did, landing on the signed-in user's default household instead. The underlying issue is
// evidently about mounting the "house" (or "screensaver") route group itself for the first
// time this session via client-side navigation, full stop - not specifically about an
// unresolved dynamic id - so every first entry into either group needs the fix, static leaf
// or dynamic one alike. (create.tsx/join.tsx have since moved to flat (app)-level routes -
// (app)/create-house.tsx, (app)/join-house.tsx - so they no longer match this pattern at
// all, the same way Settings/Admin/Feedback never did; this history is kept because the
// group-vs-id distinction still matters for everything actually under house/.)
const ROUTE_GROUP_PATTERN = /^\/(house|screensaver)(?:\/|$)/;

/**
 * True when navigating to `href` from `currentPathname` would be the *first* client-side
 * entry into the "house" or "screensaver" route group - `currentPathname` isn't already
 * inside that same group, under any id or leaf. That's the one case `navigateToHref` (see
 * lib/navigation.ts) is actually needed for; every other tile (moving between leaves
 * *within* an already-active household - e.g. that household's own dashboard to its Chat,
 * confirmed still fine with a plain push - or any tile whose href isn't in either group at
 * all, e.g. Settings/Admin/Feedback/Create house/Join house) navigates with a plain
 * `router.push` instead, same as before this was ever an issue, so the normal browser
 * back-history entry a tile tap has always produced isn't silently lost app-wide just to
 * fix this one narrow case.
 */
export const entersFreshDynamicSegment = (currentPathname: string, href: string): boolean => {
  const hrefMatch = ROUTE_GROUP_PATTERN.exec(href);
  if (!hrefMatch) return false;
  const currentMatch = ROUTE_GROUP_PATTERN.exec(currentPathname);
  return !currentMatch || currentMatch[1] !== hrefMatch[1];
};
