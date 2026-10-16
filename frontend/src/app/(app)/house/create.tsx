import { Redirect } from 'expo-router';

// This screen moved to (app)/create-house.tsx (not house-scoped - see that file and
// dashboard.tsx's own comment). Kept as a redirect stub, same reasoning as house/index.tsx:
// an old bookmark/deep link to "/house/create" should still land somewhere useful instead
// of 404ing. A declarative <Redirect> (not navigateToHref, unlike house/index.tsx) is
// enough here - the target isn't under house/ or screensaver/, so none of the
// first-entry-into-that-route-group workaround in components/Module/routeGroup.ts applies.
export default function CreateHouseRedirect() {
  return <Redirect href="/create-house" />;
}
