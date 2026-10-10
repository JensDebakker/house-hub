import * as Linking from 'expo-linking';

/** A link to `/join?code=...` - on web this resolves to the real site origin, on native to
 * the app's scheme, so clicking it (or opening it when the app isn't running) joins the
 * house directly once there's a logged-in user, or remembers the code until there is one. */
export function buildInviteLink(inviteCode: string): string {
  return Linking.createURL('/join', { queryParams: { code: inviteCode } });
}
