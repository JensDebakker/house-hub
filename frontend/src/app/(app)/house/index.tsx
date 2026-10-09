import { View } from 'react-native';
import { SubCard } from '@/components/SubCard';
import { useAuth } from '@/contexts/AuthContext';

const TILE_WRAPPER = { flexBasis: '31%', flexGrow: 1 } as const;

export default function HouseIndexScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      <View style={TILE_WRAPPER}>
        <SubCard
          title="View house"
          subtitle="Details & invite code"
          href={householdId ? '/house/view' : ''}
          color="#2563eb"
          disabled={!householdId}
        />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Create house" subtitle="Start a new house" href="/house/create" color="#059669" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Leave house" subtitle="Remove yourself" href="/house/leave" color="#dc2626" disabled />
      </View>
    </View>
  );
}
