import { router, Slot, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Module, navigateBackFromCard } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDefaultHousehold } from '@/lib/households';
import { loadScreensaverAutoStartPrefs } from '@/lib/storage';

const DASHBOARD_COLOR = '#2563eb';

// After a period of no input anywhere in the app, hand off to the screensaver - mirrors
// how the smart screen is meant to behave when left alone. Web only: this is the same
// event set the screensaver itself uses to detect activity. Whether this is enabled at
// all, and how long "idle" means, are both user-configurable via the screensaver's
// AutoStart submodule (frontend/src/app/screensaver/[householdId]/autostart.tsx) -
// prefs are re-read every time this effect re-runs rather than cached, so a change made
// there takes effect the next time the user navigates without needing a global event bus.
//
// Uses the user's default household, not a per-house route param - this hook lives at the
// top of the whole (app) segment (including the Houses overview itself, which has no
// household of its own), so it needs a household to redirect to regardless of which
// screen is currently open.
function useIdleScreensaverRedirect() {
  const { user } = useAuth();
  const pathname = usePathname();
  const householdId = resolveDefaultHousehold(user)?.householdId;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !householdId || pathname.startsWith('/screensaver')) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    loadScreensaverAutoStartPrefs().then((prefs) => {
      if (cancelled || !prefs.enabled) return;
      const idleMs = prefs.idleTimeoutMinutes * 60 * 1000;

      const schedule = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.replace(`/screensaver/${householdId}/start`), idleMs);
      };

      schedule();
      window.addEventListener('mousemove', schedule);
      window.addEventListener('keydown', schedule);
      window.addEventListener('touchstart', schedule);

      cleanup = () => {
        if (timer.current) clearTimeout(timer.current);
        window.removeEventListener('mousemove', schedule);
        window.removeEventListener('keydown', schedule);
        window.removeEventListener('touchstart', schedule);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [householdId, pathname]);
}

// The Dashboard is the base of the card stack: it never unmounts while signed in, and
// collapses into a pastel frame (title still visible) around whichever sub-route is open,
// instead of being replaced by it. Tapping that frame returns straight to it. It's now the
// Houses overview (Level 0) rather than a single house's tile grid - the online-presence
// badge that used to live here moved down to each house's own card
// (house/[householdId]/_layout.tsx), since "online" is now a per-house count, not a
// single global one.
export default function AppStackLayout() {
  useIdleScreensaverRedirect();
  const pathname = usePathname();
  const collapsed = pathname !== '/dashboard';

  return (
    <View style={{ flex: 1, backgroundColor: '#e5e7eb' }}>
      <Module
        title="Dashboard"
        color={DASHBOARD_COLOR}
        collapsed={collapsed}
        onCollapsedPress={() => navigateBackFromCard(() => router.replace('/dashboard'))}
      >
        <Slot />
      </Module>
    </View>
  );
}
