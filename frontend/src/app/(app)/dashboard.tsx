import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';

// flexGrow stays at the default 0 so tiles keep a fixed grid width - an incomplete last
// row (e.g. 1 or 2 tiles left over) stays left-aligned with blank space after it, instead
// of those tiles stretching to fill the row.
const TILE_WRAPPER = { flexBasis: '31%' } as const;

const SCREENSAVER_COLOR = '#7c3aed';

export default function DashboardScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;
  const screensaverHref = householdId ? `/screensaver/${householdId}` : '';

  // Shared by the tile's own tap-to-open and its "Start" title bar action, which does the
  // exact same navigation - Start is just an explicit shortcut for what opening the module
  // already does, not a second distinct behavior. Plain push (no cardX/Y/W/H origin) since
  // the screensaver renders as a fullscreen module, which never plays an entrance animation
  // that origin would feed anyway.
  const openScreensaver = () => {
    if (householdId) router.push(`${screensaverHref}/start` as never);
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      <View style={TILE_WRAPPER}>
        <Module
          tile
          title="Screensaver"
          subtitle="Kiosk slideshow"
          href={screensaverHref}
          color={SCREENSAVER_COLOR}
          disabled={!householdId}
          titleBarActions={
            householdId ? (
              <Pressable
                onPress={openScreensaver}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Start</Text>
              </Pressable>
            ) : undefined
          }
        />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Files" subtitle="Shared uploads" href="/files" color="#ca8a04" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Chat" subtitle="Household messages" href="/chat" color="#db2777" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="House" subtitle="View, leave, or create" href="/house" color="#dc2626" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Account" subtitle="Profile & password" href="/settings" color="#64748b" />
      </View>
      {user?.role === 'ADMIN' ? (
        <View style={TILE_WRAPPER}>
          <Module tile title="Admin" subtitle="Manage everything" href="/admin" color="#6b7280" />
        </View>
      ) : null}

      {/* Coming soon - kept behind the implemented cards above. */}
      <View style={TILE_WRAPPER}>
        <Module tile title="Tasks" subtitle="Routine chores" href="/tasks" color="#dc2626" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Shopping" subtitle="Lists" href="/shopping" color="#059669" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Supplies" subtitle="Medical & stock" href="/supplies" color="#0891b2" disabled />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Calendar" subtitle="House events" href="/calendar" color="#4f46e5" disabled />
      </View>
    </View>
  );
}
