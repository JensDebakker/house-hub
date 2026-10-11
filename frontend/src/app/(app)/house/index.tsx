import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDefaultHousehold } from '@/lib/households';
import { navigateToHref } from '@/lib/navigation';

// Bare "/house" has no screen of its own anymore - the per-house tile grid that used to
// live here moved to house/[householdId]/house.tsx. Kept as a redirect (instead of
// removing the route outright) so old links/deep links to "/house" still land somewhere
// useful instead of 404ing.
//
// An imperative useEffect, not a declarative <Redirect>: this is a fresh entry into
// house/[householdId]/... from outside that route group entirely - exactly the scenario
// this screen exists for (an old bookmark/deep link straight to "/house"), and the same
// "stuck at the nearest static ancestor, silently falls back to the wrong household" case
// every other household-targeting redirect in this app already routes through
// navigateToHref for instead of a plain replace (see lib/navigation.ts). <Redirect> can
// only ever do a single declarative replace, so it can't go through that workaround.
export default function HouseIndexRedirect() {
  const { user } = useAuth();
  const householdId = resolveDefaultHousehold(user)?.householdId;

  useEffect(() => {
    if (householdId) {
      navigateToHref(`/house/${householdId}/dashboard`);
    } else {
      router.replace('/dashboard');
    }
  }, [householdId]);

  return null;
}
