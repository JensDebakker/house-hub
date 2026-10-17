import { useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { CARD_MARGIN } from './cardSurface';
import { useCardEntranceAnimation } from './useCardEntranceAnimation';
import { useCollapseAnimation } from './useCollapseAnimation';
import { ModuleTitleBar } from './ModuleTitleBar';
import { ModuleTile } from './ModuleTile';
import { ModuleFullscreen } from './ModuleFullscreen';
import { ModuleCollapsedBody } from './ModuleCollapsedBody';
import { ModuleCardBody } from './ModuleCardBody';
import type { TitleBarContent } from './types';

export { navigateBackFromCard } from './cardExit';
export { TitleBarChip } from './TitleBarChip';
export { COLLAPSED_FRAME_CHROME_WIDTH } from './cardSurface';

/**
 * Everything the app calls a "module" - a small tappable grid tile, the card it opens into,
 * the shrunk title-bar frame that card becomes when one of its own submodules opens on top of
 * it, and a full-bleed fullscreen/kiosk display - are all one component, not separate ones
 * that happen to look related: big cards and small cards are the same thing.
 *
 * Pick a mode with `tile`/`fullscreen`/`collapsed` (in that priority): none of them set means
 * the default "open card" mode, rendered by `ModuleCardBody`. `titleBarDisplays` (read-only
 * content) and `titleBarActions` (buttons) both sit in the title bar next to the title - the
 * title itself is already the original example of a title bar action, since tapping it (a
 * tile, or a collapsed frame) navigates to that module.
 *
 * Every open/collapsed instance also plays a one-time entrance animation (`useCardEntranceAnimation`)
 * and eases through the collapse/expand transition (`useCollapseAnimation`) - both hooks run
 * unconditionally (rules of hooks) but are no-ops outside card mode. Tile and fullscreen
 * instances skip animating entirely - a tile IS the origin, and a fullscreen display has no
 * frame to expand from.
 *
 * There's no back button: returning to a parent card is done by tapping its visible collapsed
 * frame (see `collapsed`/`onCollapsedPress`), not a dedicated control.
 */
export const Module = ({
  title,
  color,
  textColor,
  href,
  extraParams,
  subtitle,
  tile = false,
  disabled = false,
  collapsed = false,
  onCollapsedPress,
  scroll = true,
  fullscreen = false,
  titleBarDisplays,
  titleBarActions,
  children,
}: {
  title: string;
  color: string;
  textColor?: string;
  /** Forward-navigation target - tile mode only. */
  href?: string;
  /** Extra route params merged into the tile's navigation, alongside the auto-computed
   * card-origin params (cardX/Y/W/H) - tile mode only. */
  extraParams?: Record<string, string>;
  /** Shown under the title - tile mode only. */
  subtitle?: string;
  /** Render as a small grid tile instead of a card. */
  tile?: boolean;
  /** Tile mode only - dims the tile and shows a "Coming soon" badge instead of navigating. */
  disabled?: boolean;
  /** True while one of this card's own sub-routes is open on top of it. */
  collapsed?: boolean;
  /** Called when the collapsed frame (anywhere outside the nested card) is tapped. */
  onCollapsedPress?: () => void;
  /** Set false when children manage their own scrolling (e.g. a FlatList) to avoid nesting scrollers. */
  scroll?: boolean;
  /** Full-bleed, no border/pastel background or margin - e.g. a kiosk display. */
  fullscreen?: boolean;
  children?: ReactNode;
} & TitleBarContent) => {
  // Entrance/exit choreography and the collapse animation only apply to the "card" modes
  // (collapsed frame and open card) - a tile has nothing to animate in from (it IS the
  // origin), and a fullscreen display has no parent frame to shrink into or expand from.
  const isCardMode = !tile && !fullscreen;

  const containerRef = useRef<View>(null);
  const { dest, progress, contentOpacity, scaleX, scaleY, translateX, translateY } = useCardEntranceAnimation(
    containerRef,
    isCardMode,
  );
  const { settleTranslateY, titleBarProps } = useCollapseAnimation(collapsed, isCardMode, progress, contentOpacity);

  const fg = textColor ?? (color === 'white' ? '#111827' : color);
  const transform = [{ translateX }, { translateY }, { scaleX }, { scaleY }, { translateY: settleTranslateY }];
  const header = (
    <ModuleTitleBar
      fg={fg}
      title={title}
      displays={titleBarDisplays}
      actions={titleBarActions}
      baseFontSize={28}
      basePaddingHorizontal={24}
      {...titleBarProps}
    />
  );

  if (tile) {
    return (
      <ModuleTile
        containerRef={containerRef}
        title={title}
        color={color}
        href={href}
        extraParams={extraParams}
        subtitle={subtitle}
        disabled={disabled}
        titleBarDisplays={titleBarDisplays}
        titleBarActions={titleBarActions}
      />
    );
  }

  if (fullscreen) {
    return (
      <ModuleFullscreen titleBarDisplays={titleBarDisplays} titleBarActions={titleBarActions}>
        {children}
      </ModuleFullscreen>
    );
  }

  return (
    <View ref={containerRef} style={{ flex: 1, margin: CARD_MARGIN }} collapsable={false}>
      <Animated.View style={{ flex: 1, opacity: dest ? 1 : 0, transform }}>
        {collapsed ? (
          <ModuleCollapsedBody color={color} header={header} onCollapsedPress={onCollapsedPress}>
            {children}
          </ModuleCollapsedBody>
        ) : (
          <ModuleCardBody color={color} scroll={scroll} header={header} contentOpacity={contentOpacity}>
            {children}
          </ModuleCardBody>
        )}
      </Animated.View>
    </View>
  );
};
