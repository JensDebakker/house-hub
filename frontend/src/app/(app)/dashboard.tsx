import { View } from 'react-native';
import { SubCard } from '@/components/SubCard';
import { useAuth } from '@/contexts/AuthContext';

const TILE_WRAPPER = { flexBasis: '31%', flexGrow: 1 } as const;

export default function DashboardScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      <View style={TILE_WRAPPER}>
        <SubCard
          title="Screensaver"
          subtitle="Kiosk slideshow"
          href={householdId ? `/screensaver/${householdId}` : ''}
          color="#111827"
          disabled={!householdId}
        />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Files" subtitle="Shared uploads" href="/files" color="#0891b2" />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="House" subtitle="View, leave, or create" href="/house" color="#0f766e" />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Settings" subtitle="Account" href="/settings" color="#64748b" />
      </View>
      {user?.role === 'ADMIN' ? (
        <View style={TILE_WRAPPER}>
          <SubCard title="Admin" subtitle="Manage everything" href="/admin" color="#dc2626" />
        </View>
      ) : null}

      {/* Coming soon - kept behind the implemented cards above. */}
      <View style={TILE_WRAPPER}>
        <SubCard title="Tasks" subtitle="Routine chores" href="/tasks" color="#2563eb" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Shopping" subtitle="Lists" href="/shopping" color="#059669" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Supplies" subtitle="Medical & stock" href="/supplies" color="#b45309" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <SubCard title="Calendar" subtitle="House events" href="/calendar" color="#7c3aed" disabled />
      </View>
    </View>
  );
}
