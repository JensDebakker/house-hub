import { router } from 'expo-router';

/**
 * Navigates to `href` via `router.replace`, with a same-frame-later follow-up `replace`
 * to the identical target.
 *
 * That follow-up isn't defensive paranoia - it's a confirmed-necessary workaround.
 * Verified via Playwright across several different accounts/households: a *single*
 * `replace` (or `push`) into a dynamic segment not already mounted anywhere (e.g. logging
 * in and landing on `/house/[householdId]/dashboard` for the first time this session, or a
 * Houses-overview tile opening that same shape of route for a household whose layout isn't
 * currently active) reliably gets stuck resolving only as far as that segment's nearest
 * static ancestor ("/house") - not a transient render that settles a tick later;
 * `window.location.pathname` itself was still "/house" even 150ms out, so it's a genuine,
 * final router state, not a timing fluke. Once stuck there, `house/index.tsx`'s own
 * redirect (meant for a *genuinely* bare `/house` visit, e.g. an old bookmark) fires and
 * silently sends the user to their *default* household instead of the one actually
 * intended - which only looks correct in casual testing when the two happen to be the same
 * household. A second `replace` to the exact same target, issued one frame later, reliably
 * resolves correctly where the first one didn't.
 *
 * Every call site that lands a user on a `house/[householdId]/...` or
 * `screensaver/[householdId]/...` route for the first time this session needs to go
 * through this (not a plain `router.replace`/`push`) - confirmed affected: login, email
 * verification, both join flows (the public `/join?code=` landing page and the in-app
 * "Join house" form), "Create house"'s post-create "View house" button, and any tile whose
 * `href` the Module tile-press handler judges to be entering a not-currently-mounted
 * household/screensaver segment (see `Module.tsx`'s own use of this).
 */
export function navigateToHref(href: string, params: Record<string, string> = {}) {
  router.replace({ pathname: href as never, params });
  requestAnimationFrame(() => {
    router.replace({ pathname: href as never, params });
  });
}
