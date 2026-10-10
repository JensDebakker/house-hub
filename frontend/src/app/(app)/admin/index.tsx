import { View } from 'react-native';
import { Module } from '@/components/Module';
import { useResponsiveColumns } from '@/lib/useResponsiveColumns';

export default function AdminIndexScreen() {
  const { tileWrapperStyle: TILE_WRAPPER } = useResponsiveColumns();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      <View style={TILE_WRAPPER}>
        <Module tile title="Users" subtitle="Accounts & roles" href="/admin/users" color="#2563eb" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Houses" subtitle="Households & data" href="/admin/houses" color="#0f766e" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Feedback" subtitle="Triage bug reports & ideas" href="/admin/feedback" color="#9333ea" />
      </View>
    </View>
  );
}
