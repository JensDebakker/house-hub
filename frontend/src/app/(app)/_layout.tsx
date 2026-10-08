import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppTabsLayout() {
  const { user } = useAuth();

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="shopping" options={{ title: 'Shopping' }} />
      <Tabs.Screen name="supplies" options={{ title: 'Supplies' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen
        name="admin"
        options={{ title: 'Admin', href: user?.role === 'ADMIN' ? undefined : null }}
      />
    </Tabs>
  );
}
