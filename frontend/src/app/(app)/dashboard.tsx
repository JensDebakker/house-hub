import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HouseStatusBadges } from '@/components/HouseStatusBadges';
import { Module } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { setDefaultHousehold } from '@/lib/households';

const DEFAULT_MARKER_COLOR = 'rgba(0,0,0,0.55)';

/** The default-house marker in a house tile's top-right corner: a filled star (not
 * tappable) if this already is the user's default, an outline star (tappable, sets it as
 * default) otherwise. Lives in `titleBarActions`, which `Module`'s tile mode already
 * swallows taps on separately from the tile's own tap-to-open - same idiom the
 * Screensaver tile's "Start" shortcut already uses. */
function DefaultHouseMarker({ isDefault, onPress, busy }: { isDefault: boolean; onPress: () => void; busy: boolean }) {
  if (isDefault) {
    return (
      <View style={{ backgroundColor: DEFAULT_MARKER_COLOR, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: 'white', fontSize: 13 }}>★</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{ backgroundColor: DEFAULT_MARKER_COLOR, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, opacity: busy ? 0.6 : 1 }}
    >
      <Text style={{ color: 'white', fontSize: 13 }}>☆</Text>
    </Pressable>
  );
}

// Level 0 of the card stack: one tile per house the user belongs to, plus a tile to join
// another one (creating a brand new house is its own global flow, see house/create.tsx).
export default function DashboardScreen() {
  const { user, refreshUser } = useAuth();
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const makeDefault = async (householdId: string) => {
    setError(null);
    setSettingDefaultId(householdId);
    try {
      await setDefaultHousehold(householdId);
      await refreshUser();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to set default house.'));
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <>
      {error ? <Text style={{ color: '#c62828', paddingHorizontal: 4 }}>{error}</Text> : null}
      <TileGrid>
        {(user?.households ?? []).map((household) => (
          <Module
            key={household.householdId}
            tile
            title={household.householdName}
            href={`/house/${household.householdId}/dashboard`}
            color="#2563eb"
            titleBarDisplays={
              <HouseStatusBadges memberCount={household.memberCount ?? 0} onlineCount={household.onlineCount ?? 0} />
            }
            titleBarActions={
              <DefaultHouseMarker
                isDefault={Boolean(household.isDefault)}
                busy={settingDefaultId === household.householdId}
                onPress={() => makeDefault(household.householdId)}
              />
            }
          />
        ))}
        <Module tile title="Create house" subtitle="Start a new house" href="/house/create" color="#c026d3" />
        <Module tile title="Join house" subtitle="Use an invite code" href="/house/join" color="#2563eb" />
      </TileGrid>
    </>
  );
}
