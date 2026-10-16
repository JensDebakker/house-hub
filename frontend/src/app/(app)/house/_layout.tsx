import { Slot } from 'expo-router';

// Looks redundant (just renders its child) - it is NOT safe to delete. expo-router
// auto-generates an *implicit native-stack navigator* for any folder with more than one
// route file and no `_layout.tsx` of its own, and this folder has four
// (index/create/join/[householdId]) - create.tsx and join.tsx are now thin redirect stubs
// to their real locations at (app)/create-house.tsx and (app)/join-house.tsx (kept so old
// bookmarks/links to /house/create and /house/join don't 404), but a redirect stub is still
// a route file for this purpose. That implicit stack, unlike the explicit `<Slot/>`
// every other layout in this app uses, keeps its own per-screen navigation state and can
// restore a stale one on remount, instead of resolving purely off the current URL.
// Confirmed via Playwright: with this file removed, tapping a house tile on the Houses
// overview (`router.push('/house/<id>/dashboard')`) consistently landed on that house's
// *Chat* screen instead of its dashboard - reproducible for every household tested,
// including the user's own. Adding this file back (a plain `<Slot/>`, same as every other
// pass-through layout in this app) fixed it outright. Don't remove it again without
// re-confirming that exact scenario still lands correctly.
export default function HouseSegmentLayout() {
  return <Slot />;
}
