import * as Linking from 'expo-linking';

/** A link to `/join?code=...` - on web this resolves to the real site origin, on native to
 * the app's scheme, so clicking it (or opening it when the app isn't running) joins the
 * house directly once there's a logged-in user, or remembers the code until there is one. */
export function buildInviteLink(inviteCode: string): string {
  return Linking.createURL('/join', { queryParams: { code: inviteCode } });
}

/**
 * The `buildInviteLink` inverse, for the in-app "Join house" form's own text input - unlike
 * tapping a real invite link (handled by `app/join.tsx` via expo-router's own query-param
 * parsing), this is free-text someone typed or pasted, so it has to be parsed by hand.
 * `Linking.parse` (not a hand-rolled `new URL`) is the right tool once we know `input` is
 * actually URL-shaped: it's the real inverse `buildInviteLink`'s own `Linking.createURL`
 * round-trips through, and on native resolves through Expo's own logic rather than React
 * Native's non-spec-compliant `URL` polyfill.
 *
 * Whether `input` is URL-shaped at all has to be decided *before* calling `Linking.parse`,
 * with a plain `includes('://')` check, not from its own return value - confirmed via
 * Playwright that its web and native implementations disagree on what a parse *failure*
 * (e.g. parsing a bare code like "ABC123", which isn't a URL) looks like: native leaves
 * `scheme: null`, but web's fallback fabricates `scheme: 'http', hostname: 'localhost'`
 * (treating the input as if it were a relative path on the current site) - so neither
 * `scheme` nor `hostname` reliably signals "this didn't parse" on both platforms, and a bare
 * code was coming back empty on web before this was caught.
 *
 * Once `input` is confirmed URL-shaped, its `code` query param (even if blank or missing) is
 * used as-is, never falling back to returning the whole link as if it were the code itself -
 * a mis-copied link with a blank/missing `code` must surface as a clear "code is required"
 * error, not a confusing one naming the garbled link.
 */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.includes('://')) return trimmed;
  const code = Linking.parse(trimmed).queryParams?.code;
  return typeof code === 'string' ? code : '';
}
