import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { CARD_MARGIN } from './cardSurface';
import { registerActiveCardExit } from './cardExit';

/**
 * Drives everything that eases in response to a module card collapsing into a title-bar
 * frame around a nested card (or expanding back out of one): the title bar's own shrink
 * (padding/font-size/min-height/scale, consumed by `ModuleTitleBar`), a small mid-transition
 * "settle" offset on the card's own transform, and - while this card is the open one -
 * registering its exit animation so `navigateBackFromCard` can play it before a route change
 * unmounts the card instead of it just disappearing instantly.
 */
export const useCollapseAnimation = (
  collapsed: boolean,
  isCardMode: boolean,
  progress: Animated.Value,
  contentOpacity: Animated.Value,
) => {
  const [collapseAnim] = useState(() => new Animated.Value(collapsed ? 1 : 0));

  useEffect(() => {
    Animated.timing(collapseAnim, { toValue: collapsed ? 1 : 0, duration: 240, useNativeDriver: false }).start();
  }, [collapsed, collapseAnim]);

  // While this card is the open one, register the reverse of its entrance animation so
  // navigateBackFromCard can shrink it back down (and fade it out) before the route change
  // that would otherwise just make it disappear instantly. Gated on isCardMode too, not just
  // collapsed, so a tile or fullscreen instance (collapsed is always false for those) never
  // registers into the singleton and silently breaks another, actually-open card's back nav.
  useEffect(() => {
    if (!isCardMode || collapsed) return;
    const exit = () =>
      new Promise<void>((resolve) => {
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
          Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => resolve());
      });
    return registerActiveCardExit(exit);
  }, [isCardMode, collapsed, contentOpacity, progress]);

  // A small mid-transition settle - as the title shrinks or grows, the frame dips slightly
  // (down while shrinking, up while growing) instead of the content just snapping into the
  // newly-freed space the instant padding/font-size finish animating. Returns to 0 at both
  // ends (collapseAnim 0 and 1) so it never leaves a permanent offset at rest - only a bump
  // in the middle of the transition.
  const settleTranslateY = collapseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, 0] });

  // Once collapsed into a frame around a nested card, the title is no longer the main
  // focus - shrink it and reclaim most of the space it used to take up. Driven off the
  // same collapseAnim as settleTranslateY above, so it eases in both directions: shrinking
  // as a nested card opens on top of it, growing back as that card is tapped away.
  //
  // paddingTop settles to CARD_MARGIN and paddingBottom to 0 (not some smaller padding on
  // both sides) so the visual gap above the title (paddingTop, against the frame's own
  // border) ends up equal to the gap below it (paddingBottom + the nested card's own
  // CARD_MARGIN, against the nested card's border) - both exactly CARD_MARGIN, instead of
  // the bottom gap coming out larger just because the nested card contributes its own
  // margin that the top side has no equivalent of.
  const titlePaddingTop = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [10, CARD_MARGIN] });
  const titlePaddingBottom = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const titlePaddingHorizontal = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 16] });
  const titleFontSize = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 14] });
  // Reserves enough height for the title's own line (roughly font size * a 1.4 line-height
  // ratio) regardless of whether displays/actions are present - see ModuleTitleBar. `minHeight`
  // on a React Native box constrains the *total* (border-box) height, so paddingTop/paddingBottom
  // eat into this budget rather than adding on top of it - the line-height allowance has to be
  // layered on top of the padding here, or an asymmetric top/bottom padding gets silently
  // squeezed down to ~0 of its intended effect whenever the padding sum is smaller than this
  // minimum (confirmed via a Playwright layout probe: before this fix, the rendered header
  // height always landed on exactly this line-height figure regardless of padding, and the
  // title sat centered on the *whole* bar instead of being offset by paddingTop/paddingBottom).
  const titleBarMinHeight = Animated.add(
    Animated.add(titlePaddingTop, titlePaddingBottom),
    collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [28 * 1.4, 14 * 1.4] }),
  );
  // Title bar displays/actions shrink at roughly the same ratio the title's own font size
  // does (14/28 = 0.5), just slightly less aggressively so small buttons/badges stay legible.
  const titleBarScale = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });

  return {
    settleTranslateY,
    titleBarProps: {
      paddingTop: titlePaddingTop,
      paddingBottom: titlePaddingBottom,
      paddingHorizontal: titlePaddingHorizontal,
      fontSize: titleFontSize,
      barMinHeight: titleBarMinHeight,
      scale: titleBarScale,
    },
  };
};
