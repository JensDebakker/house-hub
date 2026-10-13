import { router, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { Module, navigateBackFromCard } from '@/components/Module';

const SCREENSAVER_COLOR = '#7c3aed';

// Level 2 of the card stack, nested the same way Files/Chat/etc. are: this card stays
// mounted for as long as any /house/[id]/screensaver/* route is open, and collapses into a
// purple frame around whichever submodule (Layout, AutoStart) is open on top of it. The
// actual kiosk display lives at the separate top-level screensaver/[householdId]/start
// route (see that folder's own _layout.tsx) - it deliberately escapes all of this card
// nesting since it's meant to take over the whole screen, not open "in" anything.
export default function HouseScreensaverLayout() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const pathname = usePathname();
  const basePath = `/house/${householdId}/screensaver`;

  return (
    <Module
      title="Screensaver"
      color={SCREENSAVER_COLOR}
      collapsed={pathname !== basePath}
      onCollapsedPress={() =>
        navigateBackFromCard(() => router.replace({ pathname: `/house/${householdId}/screensaver/index` as never }))
      }
    >
      <Slot />
    </Module>
  );
}
