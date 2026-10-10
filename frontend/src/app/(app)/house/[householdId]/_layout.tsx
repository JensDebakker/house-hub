import { router, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { Module, navigateBackFromCard } from '@/components/Module';
import { OnlineBadge, useOnlinePresence } from '@/components/OnlineBadge';
import { useAuth } from '@/contexts/AuthContext';

const HOUSE_COLOR = '#dc2626';

// Level 1 of the card stack, one level below the Houses overview: this card stays mounted
// for as long as any /house/[householdId]/* route is open, and collapses into a frame
// titled with that house's own name around whichever feature screen (dashboard's own tile
// grid, chat, files, ...) is open on top of it. Tapping the collapsed frame goes all the
// way back to the Houses overview, not just up one level - there's nothing to show in
// between.
//
// The live "N online" badge used to be subscribed globally (one connection, "household 0
// is THE household"); now that WebSocketContext opens a connection per the house actually
// being viewed, subscribing here - once per house card, for as long as that house is open
// - is what keeps the count alive across this card's own collapsed/open transitions.
export default function HouseLayout() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const { user } = useAuth();
  const pathname = usePathname();
  const household = user?.households.find((h) => h.householdId === householdId);
  const basePath = `/house/${householdId}`;
  const collapsed = pathname !== `${basePath}/dashboard`;
  const onlineCount = useOnlinePresence();

  return (
    <Module
      title={household?.householdName ?? 'House'}
      color={HOUSE_COLOR}
      collapsed={collapsed}
      onCollapsedPress={() => navigateBackFromCard(() => router.replace('/dashboard'))}
      titleBarDisplays={<OnlineBadge count={onlineCount} />}
    >
      <Slot />
    </Module>
  );
}
