import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { joinPendingHousehold } from '@/lib/pendingInvite';
import { savePendingInviteCode } from '@/lib/storage';

/** Public landing spot for a `/join?code=...` invite link - reachable whether logged in or
 * not (registered outside both auth-gated groups in the root layout). Logged in: joins the
 * house immediately. Logged out: remembers the code and sends the user to log in/register;
 * `login.tsx`/`verify-email.tsx` apply it once that completes. */
export default function JoinLinkScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { isAuthenticated, refreshUser } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (!code || handled.current) return;
    handled.current = true;

    (async () => {
      try {
        await savePendingInviteCode(code);
        if (!isAuthenticated) return;
        if (await joinPendingHousehold()) await refreshUser();
      } catch {
        // Best effort - still navigate below so the user isn't stuck on this screen.
      } finally {
        router.replace(isAuthenticated ? '/house/view' : '/');
      }
    })();
  }, [code, isAuthenticated, refreshUser]);

  return (
    <ScreenContainer>
      {code ? (
        <>
          <ActivityIndicator />
          <Text style={{ color: '#666' }}>Joining house…</Text>
        </>
      ) : (
        <Text style={{ color: '#c62828' }}>This invite link is missing a code.</Text>
      )}
    </ScreenContainer>
  );
}
