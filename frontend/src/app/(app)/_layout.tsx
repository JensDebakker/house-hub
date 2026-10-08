import { Stack } from 'expo-router';

export default function AppStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
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
