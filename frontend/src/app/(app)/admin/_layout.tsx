import { Slot } from 'expo-router';
import { View } from 'react-native';
import { AdminTabBar } from '@/components/AdminTabBar';

export default function AdminLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AdminTabBar />
      <Slot />
    </View>
  );
}
