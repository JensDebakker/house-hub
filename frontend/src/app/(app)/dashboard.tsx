import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Module, TitleBarChip } from '@/components/Module';
import { OnlineBadge } from '@/components/OnlineBadge';
import { TileGrid } from '@/components/TileGrid';
import { LANGUAGE_COLOR } from '@/components/LanguageModuleCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/api';
import { formatMemberCount } from '@/lib/houseStatus';
import { assignHouseColors } from '@/lib/houseColors';
import { setDefaultHousehold } from '@/lib/households';

const DEFAULT_MARKER_COLOR = '#f59e0b';

/** The default-house marker in a house tile's top-right corner: a filled star (not
 * tappable) if this already is the user's default, an outline star (tappable, sets it as
 * default) otherwise. Lives in `titleBarActions`, which `Module`'s tile mode already
 * swallows taps on separately from the tile's own tap-to-open - same idiom the
 * Screensaver tile's "Start" shortcut already uses. */
function DefaultHouseMarker({ isDefault, onPress, busy }: { isDefault: boolean; onPress: () => void; busy: boolean }) {
  return (
    <TitleBarChip color={DEFAULT_MARKER_COLOR} onPress={isDefault ? undefined : onPress} disabled={busy}>
      <Text style={{ color: DEFAULT_MARKER_COLOR, fontSize: 13 }}>{isDefault ? '★' : '☆'}</Text>
    </TitleBarChip>
  );
}

// Level 0 of the card stack: one tile per house the user belongs to, plus the app-level
// (not house-scoped) tiles - Create house, Join house, App, Account, Feedback, and (for
// admins) Admin. Create/Join house live as flat (app)-level routes (create-house.tsx,
// join-house.tsx), not nested under house/, for the same reason Account/Feedback/Admin do:
// neither is about an existing specific house, so there's nothing for them to nest under.
export default function DashboardScreen() {
  const { user, setHouseholds } = useAuth();
  const { t } = useTranslation();
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Computed once per households change, not once per tile - assignHouseColors itself
  // resolves collisions over the whole list, so calling it from inside the .map() below
  // would redo that same whole-list work for every single tile on every render.
  const houseColors = useMemo(
    () => assignHouseColors((user?.households ?? []).map((h) => h.householdId)),
    [user?.households],
  );

  const makeDefault = async (householdId: string) => {
    setError(null);
    setSettingDefaultId(householdId);
    try {
      const households = await setDefaultHousehold(householdId);
      setHouseholds(households);
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
            subtitle={formatMemberCount(household.memberCount ?? 0)}
            href={`/house/${household.householdId}/dashboard`}
            color={houseColors.get(household.householdId) ?? '#2563eb'}
            titleBarDisplays={<OnlineBadge count={household.onlineCount ?? 0} compact />}
            titleBarActions={
              <DefaultHouseMarker
                isDefault={Boolean(household.isDefault)}
                busy={settingDefaultId === household.householdId}
                onPress={() => makeDefault(household.householdId)}
              />
            }
          />
        ))}
        <Module tile title="Create house" subtitle="Start a new house" href="/create-house" color="#c026d3" />
        <Module tile title="Join house" subtitle="Use an invite code" href="/join-house" color="#2563eb" />
        <Module tile title="App" subtitle="Install & app info" href="/app" color="#0ea5e9" />
        <Module tile title={t('language.title')} subtitle={t('language.subtitle')} href="/language" color={LANGUAGE_COLOR} />
        <Module tile title="Account" subtitle="Profile & password" href="/settings" color="#64748b" />
        <Module tile title="Feedback" subtitle="Report a bug or idea" href="/feedback" color="#f97316" />
        {user?.role === 'ADMIN' ? (
          <Module tile title="Admin" subtitle="Manage everything" href="/admin" color="#6b7280" />
        ) : null}
      </TileGrid>
    </>
  );
}
