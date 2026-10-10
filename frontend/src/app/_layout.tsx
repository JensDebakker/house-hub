import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { InAppBrowserBanner } from '@/components/InAppBrowserBanner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

// react-native-web's showsVerticalScrollIndicator={false} only hides Firefox's
// scrollbar (via scrollbar-width). This covers Chrome/Safari/Edge too.
function useHideWebScrollbars() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = '::-webkit-scrollbar { width: 0; height: 0; display: none; }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
        {/* Smart-screen kiosk display — a house member feature, so it stays behind auth
            like the rest of the app; the backend still scopes its data to householdId
            membership on top of this. */}
        <Stack.Screen name="screensaver/[householdId]" />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Reachable regardless of auth state - it decides for itself what to do with the
          code depending on whether a user is logged in. Declared last: '/' collides
          between (app)/index.tsx and (auth)/index.tsx, and when that collision stops
          either from resolving, the Stack falls back to its *first* declared screen -
          which must not be this one, or an unrelated bare '/' load lands here showing
          "missing a code" instead of the real landing/dashboard screen. */}
      <Stack.Screen name="join" />
    </Stack>
  );
}

export default function RootLayout() {
  useHideWebScrollbars();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <View style={{ flex: 1 }}>
      {/* Rendered outside auth/loading state so it shows up as early as possible - the
          whole point is to catch someone before the in-app browser's JS throttling can
          strand them mid-load. */}
      <InAppBrowserBanner />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            <RootNavigator />
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}
