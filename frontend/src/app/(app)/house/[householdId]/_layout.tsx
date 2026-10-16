import { router, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { useMemo } from 'react';
import { Module, navigateBackFromCard } from '@/components/Module';
import { OnlineBadge, useOnlinePresence } from '@/components/OnlineBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { getHouseColor } from '@/lib/houseColors';
import { findHouseholdMembership } from '@/lib/households';

// Level 1 of the card stack, one level below the Houses overview: this card stays mounted
// for as long as any /house/[householdId]/* route is open, and collapses into a frame
// titled with that house's own name around whichever feature screen (dashboard's own tile
// grid, chat, files, ...) is open on top of it. Tapping the collapsed frame goes back to
// *this house's own* tile grid (basePath/dashboard), one level up - not all the way out to
// the Houses overview, same as every other instance of this collapsed-frame pattern
// (screensaver/[householdId]/_layout.tsx, the old house/_layout.tsx) targets its own base
// route rather than jumping past it.
//
// Color comes from getHouseColor(user, householdId), the same call the Houses overview
// tile for this house makes - this card has to open in the exact color its own tile was,
// not a fixed "House" color shared by every household.
//
// The live "N online" badge used to be subscribed globally (one connection, "household 0
// is THE household"); now that WebSocketContext opens a connection per the house actually
// being viewed, subscribing here - once per house card, for as long as that house is open
// - is what keeps the count alive across this card's own collapsed/open transitions.
export default function HouseLayout() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();
  const household = findHouseholdMembership(user, householdId);
  const basePath = `/house/${householdId}`;
  const collapsed = pathname !== `${basePath}/dashboard`;
  const onlineCount = useOnlinePresence();
  // This layout stays mounted across every sub-route inside the house (dashboard, chat,
  // files, ...), re-rendering on each one via usePathname() above - memoized so switching
  // tabs doesn't re-run the color assignment's full sort+hash+collision pass each time.
  const color = useMemo(() => getHouseColor(user, householdId), [user, householdId]);

  return (
    <Module
      title={household?.householdName ?? t('house.layout.fallbackTitle')}
      color={color}
      collapsed={collapsed}
      onCollapsedPress={() => navigateBackFromCard(() => router.replace(`/house/${householdId}/dashboard`))}
      titleBarDisplays={<OnlineBadge count={onlineCount} />}
    >
      <Slot />
    </Module>
  );
}
