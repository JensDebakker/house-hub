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
 * parsing), this is free-text someone typed or pasted, so it has to be parsed by hand. If
 * `input` parses as an absolute URL (any scheme - `https://...` on web, `househub://...` on
 * native, matching whatever `buildInviteLink`/`Linking.createURL` actually produced) and
 * carries a `code` query param, that's the invite code. Otherwise `input` is assumed to
 * already be a bare code, same as before this existed - trimmed and returned as-is.
 */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  try {
    const code = new URL(trimmed).searchParams.get('code');
    if (code) return code;
  } catch {
    // Not a parseable absolute URL - fall through to treating it as a bare code.
  }
  return trimmed;
}
