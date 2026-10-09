import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
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
    </Stack>
  );
}

export default function RootLayout() {
  useHideWebScrollbars();

  return (
    <AuthProvider>
      <WebSocketProvider>
        <RootNavigator />
      </WebSocketProvider>
    </AuthProvider>
  );
}
