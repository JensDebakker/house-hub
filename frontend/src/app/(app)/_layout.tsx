import { router, Stack, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const IDLE_REDIRECT_MS = 2 * 60 * 1000;

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

export default function AppStackLayout() {
  useIdleScreensaverRedirect();

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="shopping" />
      <Stack.Screen name="supplies" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="files" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
