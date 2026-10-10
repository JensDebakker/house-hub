import { View } from 'react-native';
import { SubCard } from '@/components/SubCard';
import { useAuth } from '@/contexts/AuthContext';

// flexGrow stays at the default 0 so tiles keep a fixed grid width - an incomplete last
// row (e.g. 1 or 2 tiles left over) stays left-aligned with blank space after it, instead
// of those tiles stretching to fill the row.
const TILE_WRAPPER = { flexBasis: '31%' } as const;

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
          color="#db2777"
          disabled={!householdId}
        />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Create house" subtitle="Start a new house" href="/house/create" color="#c026d3" />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Join house" subtitle="Use an invite code" href="/house/join" color="#2563eb" />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard
          title="Manage house"
          subtitle="Members & roles"
          href={householdId ? '/house/manage' : ''}
          color="#0f766e"
          disabled={!householdId}
        />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard
          title="Leave house"
          subtitle="Remove yourself"
          href={householdId ? '/house/leave' : ''}
          color="#e11d48"
          disabled={!householdId}
        />
      </View>
    </View>
  );
}
