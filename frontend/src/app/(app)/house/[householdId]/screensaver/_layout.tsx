import { router, Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { Text } from 'react-native';
import { Module, navigateBackFromCard, TitleBarChip } from '@/components/Module';
import { useTranslation } from '@/i18n';
import { navigateToHref } from '@/lib/navigation';

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
  const { t } = useTranslation();
  const basePath = `/house/${householdId}/screensaver`;
  // Same "Start" shortcut the Houses dashboard's own Screensaver tile offers, kept available
  // here too - previously this card's own header had no titleBarActions at all, so once a
  // user had actually opened into the Screensaver section (rather than tapping Start
  // straight from the dashboard tile), there was no way to launch the kiosk display without
  // first collapsing back out to the dashboard. See dashboard.tsx's own openScreensaver for
  // why navigateToHref (not a plain router.replace) and the returnTo param.
  const openScreensaver = () => {
    navigateToHref(`/screensaver/${householdId}/start`, { returnTo: pathname });
  };

  return (
    <Module
      title={t('screensaver.title')}
      color={SCREENSAVER_COLOR}
      collapsed={pathname !== basePath}
      onCollapsedPress={() =>
        navigateBackFromCard(() => router.replace({ pathname: `/house/${householdId}/screensaver/index` as never }))
      }
      titleBarActions={
        <TitleBarChip color={SCREENSAVER_COLOR} onPress={openScreensaver}>
          <Text style={{ color: SCREENSAVER_COLOR, fontSize: 11, fontWeight: '700' }}>{t('screensaver.start')}</Text>
        </TitleBarChip>
      }
    >
      <Slot />
    </Module>
  );
}
