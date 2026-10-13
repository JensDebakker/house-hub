import { useLocalSearchParams, usePathname } from 'expo-router';
import { Text } from 'react-native';
import { Module, TitleBarChip } from '@/components/Module';
import { TileGrid } from '@/components/TileGrid';
import { useAuth } from '@/contexts/AuthContext';
import { navigateToHref } from '@/lib/navigation';

const SCREENSAVER_COLOR = '#7c3aed';

// The house's own feature tile grid - Level 2 of the card stack, open whenever this is
// exactly house/[householdId]/dashboard (house/[householdId]/_layout.tsx collapses into a
// frame around it otherwise). This is the same flat grid every house used to land on
// directly off login before the Houses overview existed one level up.
export default function HouseDashboardScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { user } = useAuth();
  const pathname = usePathname();
  // The tile's own tap-to-open (via Module's onTilePress) goes here - a normal nested
  // settings screen under this house's own route, same as Files/Chat, so it opens "in" the
  // house card's own frame instead of jumping out to a different screen entirely.
  const screensaverHref = `/house/${householdId}/screensaver`;
  // The "Start" title bar action is a distinct target, not just a shortcut into the tile
  // above: it jumps straight to the actual kiosk display, which deliberately lives at the
  // separate top-level screensaver/[householdId]/start route (see that route's own
  // _layout.tsx) so it can escape all card chrome and take over the whole screen - no
  // cardX/Y/W/H origin params, since there's no parent frame for it to expand out of.
  // Uses the shared `navigateToHref` (replace + same-frame-later follow-up replace) rather
  // than a plain `router.replace` - this is the exact same kind of never-before-mounted
  // dynamic-segment jump (house/[householdId] -> screensaver/[householdId], a different
  // top-level Stack.Screen entirely) that a single replace doesn't reliably land on the
  // full path for. See lib/navigation.ts for how that was confirmed.
  //
  // Passes this screen's own pathname as `returnTo` so the kiosk display's touch-to-dismiss
  // can send the user back here rather than to some fixed default.
  const openScreensaver = () => {
    navigateToHref(`/screensaver/${householdId}/start`, { returnTo: pathname });
  };

  return (
    <TileGrid>
      <Module
        tile
        title="Screensaver"
        subtitle="Kiosk slideshow"
        href={screensaverHref}
        color={SCREENSAVER_COLOR}
        titleBarActions={
          <TitleBarChip color={SCREENSAVER_COLOR} onPress={openScreensaver}>
            <Text style={{ color: SCREENSAVER_COLOR, fontSize: 11, fontWeight: '700' }}>Start</Text>
          </TitleBarChip>
        }
      />
      <Module tile title="Files" subtitle="Shared uploads" href={`/house/${householdId}/files`} color="#ca8a04" />
      <Module tile title="Chat" subtitle="Household messages" href={`/house/${householdId}/chat`} color="#db2777" />
      <Module tile title="House" subtitle="View, leave, or manage" href={`/house/${householdId}/house`} color="#dc2626" />
      <Module tile title="Account" subtitle="Profile & password" href="/settings" color="#64748b" />
      <Module tile title="Feedback" subtitle="Report a bug or idea" href="/feedback" color="#f97316" />
      {user?.role === 'ADMIN' ? (
        <Module tile title="Admin" subtitle="Manage everything" href="/admin" color="#6b7280" />
      ) : null}

      {/* Coming soon - kept behind the implemented cards above. */}
      <Module tile title="Tasks" subtitle="Routine chores" href={`/house/${householdId}/tasks`} color="#dc2626" disabled />
      <Module tile title="Shopping" subtitle="Lists" href={`/house/${householdId}/shopping`} color="#059669" disabled />
      <Module tile title="Supplies" subtitle="Medical & stock" href={`/house/${householdId}/supplies`} color="#0891b2" disabled />
      <Module tile title="Calendar" subtitle="House events" href={`/house/${householdId}/calendar`} color="#4f46e5" disabled />
    </TileGrid>
  );
}
