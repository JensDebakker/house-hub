import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { SubCard } from '@/components/SubCard';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketChannel } from '@/contexts/WebSocketContext';
import { pastelize } from '@/lib/color';

// flexGrow stays at the default 0 so tiles keep a fixed grid width - an incomplete last
// row (e.g. 1 or 2 tiles left over) stays left-aligned with blank space after it, instead
// of those tiles stretching to fill the row.
const TILE_WRAPPER = { flexBasis: '31%' } as const;

const ONLINE_COLOR = '#16a34a';

export default function DashboardScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  // null until the first "presence" push arrives, so the pill never flashes a stale
  // or zero count before the backend has actually reported one.
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  const handlePresence = useCallback((payload: unknown) => {
    const count = (payload as { count?: number } | undefined)?.count;
    if (typeof count === 'number') setOnlineCount(count);
  }, []);

  useWebSocketChannel('presence', handlePresence);

  return (
    <View style={{ gap: 14 }}>
      {onlineCount !== null ? (
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pastelize(ONLINE_COLOR),
            borderWidth: 2,
            borderColor: ONLINE_COLOR,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ONLINE_COLOR }} />
          <Text style={{ color: ONLINE_COLOR, fontSize: 13, fontWeight: '700' }}>
            {onlineCount} online
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <View style={TILE_WRAPPER}>
          <SubCard
            title="Screensaver"
            subtitle="Kiosk slideshow"
            href={householdId ? `/screensaver/${householdId}` : ''}
            color="#7c3aed"
            disabled={!householdId}
          />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="Files" subtitle="Shared uploads" href="/files" color="#ca8a04" />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="Chat" subtitle="Household messages" href="/chat" color="#db2777" />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="House" subtitle="View, leave, or create" href="/house" color="#dc2626" />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="Account" subtitle="Profile & password" href="/settings" color="#64748b" />
        </View>
        {user?.role === 'ADMIN' ? (
          <View style={TILE_WRAPPER}>
            <SubCard title="Admin" subtitle="Manage everything" href="/admin" color="#6b7280" />
          </View>
        ) : null}

        {/* Coming soon - kept behind the implemented cards above. */}
        <View style={TILE_WRAPPER}>
          <SubCard title="Tasks" subtitle="Routine chores" href="/tasks" color="#dc2626" disabled />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="Shopping" subtitle="Lists" href="/shopping" color="#059669" disabled />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="Supplies" subtitle="Medical & stock" href="/supplies" color="#0891b2" disabled />
        </View>
        <View style={TILE_WRAPPER}>
          <SubCard title="Calendar" subtitle="House events" href="/calendar" color="#4f46e5" disabled />
        </View>
      </View>
    </View>
  );
}
