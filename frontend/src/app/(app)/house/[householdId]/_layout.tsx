import { router, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { Module, navigateBackFromCard } from '@/components/Module';
import { OnlineBadge, useOnlinePresence } from '@/components/OnlineBadge';
import { useAuth } from '@/contexts/AuthContext';
import { findHouseholdMembership } from '@/lib/households';

const HOUSE_COLOR = '#dc2626';

// Level 1 of the card stack, one level below the Houses overview: this card stays mounted
// for as long as any /house/[householdId]/* route is open, and collapses into a frame
// titled with that house's own name around whichever feature screen (dashboard's own tile
// grid, chat, files, ...) is open on top of it. Tapping the collapsed frame goes back to
// *this house's own* tile grid (basePath/dashboard), one level up - not all the way out to
// the Houses overview, same as every other instance of this collapsed-frame pattern
// (screensaver/[householdId]/_layout.tsx, the old house/_layout.tsx) targets its own base
// route rather than jumping past it.
//
// The live "N online" badge used to be subscribed globally (one connection, "household 0
// is THE household"); now that WebSocketContext opens a connection per the house actually
// being viewed, subscribing here - once per house card, for as long as that house is open
// - is what keeps the count alive across this card's own collapsed/open transitions.
export default function HouseLayout() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { user } = useAuth();
  const pathname = usePathname();
  const household = findHouseholdMembership(user, householdId);
  const basePath = `/house/${householdId}`;
  const collapsed = pathname !== `${basePath}/dashboard`;
  const onlineCount = useOnlinePresence();

  return (
    <Module
      title={household?.householdName ?? 'House'}
      color={HOUSE_COLOR}
      collapsed={collapsed}
      onCollapsedPress={() => navigateBackFromCard(() => router.replace(`/house/${householdId}/dashboard`))}
      titleBarDisplays={<OnlineBadge count={onlineCount} />}
    >
      <Slot />
    </Module>
  );
}
