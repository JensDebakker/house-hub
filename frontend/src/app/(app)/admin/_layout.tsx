import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Users' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'User' }} />
      <Stack.Screen name="houses/index" options={{ title: 'Houses' }} />
      <Stack.Screen name="houses/[id]" options={{ title: 'House' }} />
    </Stack>
  );
}
