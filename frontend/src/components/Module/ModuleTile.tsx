import { router, usePathname } from 'expo-router';
import { type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '@/i18n';
import { oppositeCorners } from '@/lib/color';
import { navigateToHref } from '@/lib/navigation';
import { cardSurface } from './cardSurface';
import { entersFreshDynamicSegment } from './routeGroup';
import { TitleBarChip } from './TitleBarChip';
import type { TitleBarContent } from './types';

const TILE_TITLE_FONT_SIZE = 17;
const CORNER_BADGE_FONT_SIZE = 11;

/** Renders a `Module` as a small tappable grid tile - the entry point that opens the full
 * card, rather than the card itself. See `Module` for the shared mode picture.
 *
 * The title renders at a fixed size, with `numberOfLines` as its only overflow handling -
 * no dynamic shrink-to-fit measurement. An earlier version measured the title and any corner
 * badge via hidden shadow siblings and shrank both to avoid overlap, which worked in every
 * desktop/Playwright test but caused continuous visible flicker on a real device ("the
 * letters keep shifting back and forth") - each measurement pass's width-driven state update
 * could itself nudge a real device's sub-pixel layout rounding by a hair, retriggering
 * another measurement, indefinitely. Moving badges into their own row below the title instead
 * of absolutely-positioned corners removes the need for any of that measuring in the first
 * place: a title and a badge in normal document flow, one above the other, can't overlap
 * regardless of either one's size - the browser/Yoga layout engine already guarantees that
 * for free, for both web and native, with no measurement loop to ever go wrong. */
export const ModuleTile = ({
  containerRef,
  title,
  color,
  href,
  extraParams,
  subtitle,
  disabled = false,
  titleBarDisplays,
  titleBarActions,
}: {
  containerRef: RefObject<View | null>;
  title: string;
  color: string;
  href?: string;
  extraParams?: Record<string, string>;
  subtitle?: string;
  disabled?: boolean;
} & TitleBarContent) => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const onTilePress = () => {
    if (disabled || !href) return;
    containerRef.current?.measureInWindow((x, y, width, height) => {
      const cardParams = {
        cardX: String(x),
        cardY: String(y),
        cardW: String(width),
        cardH: String(height),
        ...extraParams,
      };
      if (entersFreshDynamicSegment(pathname, href)) {
        navigateToHref(href, cardParams);
      } else {
        router.push({ pathname: href as never, params: cardParams });
      }
    });
  };

  const hasDisplay = disabled || !!titleBarDisplays;
  const hasAction = !disabled && !!titleBarActions;

  return (
    <Pressable
      ref={containerRef}
      onPress={onTilePress}
      style={({ pressed }) => [
        {
          ...cardSurface(color),
          ...oppositeCorners(18),
          padding: 16,
          aspectRatio: 1.5,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
        },
        !disabled && pressed && { opacity: 0.85 },
      ]}
    >
      <Text numberOfLines={2} style={{ fontSize: TILE_TITLE_FONT_SIZE, fontWeight: '700', color, textAlign: 'center' }}>
        {title}
      </Text>
      {/* A normal-flow row below the title, not the old absolutely-positioned top corners -
          "Coming soon" is a read-only status for an inactive module, not an action, so it
          goes in the same display slot a real titleBarDisplays would. titleBarActions (e.g.
          Screensaver's "Start") sits alongside it; the two never land in the same tile since
          `disabled` tiles don't carry actions. Swallows its own taps (same idiom the open/
          collapsed card header's title bar uses) so tapping a badge/button here doesn't also
          fire the tile's own onTilePress underneath it. */}
      {hasDisplay || hasAction ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          {disabled ? (
            <TitleBarChip color="#6b7280">
              <Text numberOfLines={1} style={{ color: '#6b7280', fontSize: CORNER_BADGE_FONT_SIZE, fontWeight: '700' }}>
                {t('house.module.comingSoon')}
              </Text>
            </TitleBarChip>
          ) : titleBarDisplays ? (
            <Pressable onPress={() => {}}>{titleBarDisplays}</Pressable>
          ) : null}
          {hasAction ? <Pressable onPress={() => {}}>{titleBarActions}</Pressable> : null}
        </View>
      ) : null}
      {subtitle ? (
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2, textAlign: 'center' }}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );
};
