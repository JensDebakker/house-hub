import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDefaultHousehold } from '@/lib/households';
import { navigateToHref } from '@/lib/navigation';

// "/" has no screen of its own - it hands off to the signed-in user's default house's
// dashboard, or the Houses overview itself if they somehow have no household yet.
//
// An imperative useEffect, not a declarative <Redirect>: this is a fresh entry into
// house/[householdId]/... from outside that route group entirely (e.g. following
// screensaver/[householdId]/start.tsx's "Open House Hub ->" link, which lands here) - the
// same "stuck at the nearest static ancestor, silently falls back to the wrong household"
// case every other household-targeting redirect in this app already routes through
// navigateToHref for instead of a plain replace (see lib/navigation.ts). <Redirect> can
// only ever do a single declarative replace, so it can't go through that workaround.
export default function AppIndexRedirect() {
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
