import { Redirect } from 'expo-router';

// This screen moved to (app)/join-house.tsx (not house-scoped - see that file and
// dashboard.tsx's own comment). Kept as a redirect stub, same reasoning as house/index.tsx:
// an old bookmark/deep link to "/house/join" should still land somewhere useful instead of
// 404ing. A declarative <Redirect> (not navigateToHref, unlike house/index.tsx) is enough
// here - the target isn't under house/ or screensaver/, so none of the
// first-entry-into-that-route-group workaround in components/Module/routeGroup.ts applies.
//
// Not to be confused with the public /join?code=... deep-link landing page (src/app/join.tsx,
// outside both auth-gated groups) - that handles an invite link; this only redirects an old
// bookmark of the in-app join *form* itself.
export default function JoinHouseRedirect() {
  return <Redirect href="/join-house" />;
}
