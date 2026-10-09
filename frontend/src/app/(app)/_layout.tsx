import { router, Slot, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';

const IDLE_REDIRECT_MS = 2 * 60 * 1000;
const DASHBOARD_COLOR = '#b91c1c';

// After a couple of minutes of no input anywhere in the app, hand off to the
// screensaver - mirrors how the smart screen is meant to behave when left alone.
// Web only: this is the same event set the screensaver itself uses to detect activity.
function useIdleScreensaverRedirect() {
  const { user } = useAuth();
  const pathname = usePathname();
  const householdId = user?.households[0]?.householdId;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !householdId || pathname.startsWith('/screensaver')) return;

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.replace(`/screensaver/${householdId}`), IDLE_REDIRECT_MS);
    };

    schedule();
    window.addEventListener('mousemove', schedule);
    window.addEventListener('keydown', schedule);
    window.addEventListener('touchstart', schedule);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('mousemove', schedule);
      window.removeEventListener('keydown', schedule);
      window.removeEventListener('touchstart', schedule);
    };
  }, [householdId, pathname]);
}

// The Dashboard is the base of the card stack: it never unmounts while signed in, and
// collapses into a red frame (title still visible) around whichever sub-route is open,
// instead of being replaced by it. Tapping that frame returns straight to it.
export default function AppStackLayout() {
  useIdleScreensaverRedirect();
  const { user } = useAuth();
  const pathname = usePathname();
  const collapsed = pathname !== '/dashboard';

  return (
    <View style={{ flex: 1, backgroundColor: '#e5e7eb' }}>
      <BigCardShell
        title={`Welcome${user ? `, ${user.displayName}` : ''}`}
        color={DASHBOARD_COLOR}
        isRoot
        collapsed={collapsed}
        onCollapsedPress={() => router.replace('/dashboard')}
      >
        <Slot />
      </BigCardShell>
    </View>
  );
}
