import { router, usePathname, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { oppositeCorners, pastelize } from '@/lib/color';
import { navigateToHref } from '@/lib/navigation';

const CARD_MARGIN = 6;

// A colored card gets a pastel fill with the accent as its border - the same treatment
// used by a tile, so the module's color carries through from tile to opened card.
function cardSurface(color: string) {
  return { backgroundColor: pastelize(color), borderWidth: 2, borderColor: color };
}

// At most one Module is ever "open" (collapsed=false, not tile/fullscreen) at a time, since
// each level of the card stack only goes active once its own route is the exact match - so a
// single slot is enough to let whichever one is currently open register a reverse-of-entrance
// shrink animation, for `navigateBackFromCard` to play before the route (and this card)
// actually goes away.
let activeCardExit: (() => Promise<void>) | null = null;

/** Wraps a "go back to the parent" navigation call so the currently open card's exit
 * animation (if one is registered) finishes before the route change unmounts it. */
export function navigateBackFromCard(navigate: () => void) {
  if (!activeCardExit) {
    navigate();
    return;
  }
  const exit = activeCardExit;
  activeCardExit = null;
  exit().then(navigate);
}

// Matches "/house/..." or "/screensaver/..." - the two route groups whose first
// client-side entry (from somewhere outside that group entirely) needs navigateToHref.
// Group 1: which one ("house" or "screensaver").
//
// This is intentionally a GROUP match, not a dynamic-segment-id match: an earlier version
// of this check only special-cased entries into `[householdId]` specifically (treating
// house/create.tsx and house/join.tsx, which have no household id at all, as always safe
// for a plain push). Confirmed via Playwright that was wrong - tapping "Create house" from
// the Houses overview with a plain `router.push('/house/create')` got stuck exactly the
// same way `/house/[householdId]/...` did, landing on the signed-in user's default
// household instead. The underlying issue is evidently about mounting the "house" (or
// "screensaver") route group itself for the first time this session via client-side
// navigation, full stop - not specifically about an unresolved dynamic id - so every
// first entry into either group needs the fix, static leaf or dynamic one alike.
const ROUTE_GROUP_PATTERN = /^\/(house|screensaver)(?:\/|$)/;

/**
 * True when navigating to `href` from `currentPathname` would be the *first* client-side
 * entry into the "house" or "screensaver" route group - `currentPathname` isn't already
 * inside that same group, under any id or leaf. That's the one case `navigateToHref` (see
 * lib/navigation.ts) is actually needed for; every other tile (moving between leaves
 * *within* an already-active household - e.g. that household's own dashboard to its Chat,
 * confirmed still fine with a plain push - or any tile whose href isn't in either group at
 * all, e.g. Settings/Admin/Feedback) navigates with a plain `router.push` instead, same as
 * before this was ever an issue, so the normal browser back-history entry a tile tap has
 * always produced isn't silently lost app-wide just to fix this one narrow case. */
function entersFreshDynamicSegment(currentPathname: string, href: string): boolean {
  const hrefMatch = ROUTE_GROUP_PATTERN.exec(href);
  if (!hrefMatch) return false;
  const currentMatch = ROUTE_GROUP_PATTERN.exec(currentPathname);
  return !currentMatch || currentMatch[1] !== hrefMatch[1];
}

/**
 * A title-bar display or action slot. `transform: scale` (used to visually shrink this
 * alongside the title as a module collapses) never shrinks an element's own contribution to
 * its parent's layout - that's true in CSS and in React Native's Yoga layout engine alike,
 * since transforms are purely a paint-time effect. Left alone, that means the header row
 * would keep reserving this slot's full, unscaled size even while it's rendered visually
 * smaller - wasted invisible height that stops the title bar from ever getting as short as it
 * looks, which in turn stops a nested module from rising to fully occupy the space that
 * shrinking the title (and this slot) was supposed to free up.
 *
 * Fixed by measuring the slot's natural (pre-transform) size via a hidden, unscaled shadow
 * copy, then explicitly sizing the real (visible) wrapper to `naturalSize * scale` with
 * `overflow: hidden`. That visible box now actually shrinks in lockstep with the visual
 * scale, so the row's real reserved height tracks what's on screen.
 *
 * The shadow copy has to be a sibling kept entirely out of the shrinking box, not nested
 * inside it - an in-flow child measured from inside a box that's itself sized off that same
 * measurement creates a feedback loop (each pass's smaller box constrains the child's own
 * layout width, which re-fires onLayout with an even smaller size, shrinking the box
 * further, converging to zero) and even `position: 'absolute'` on that child isn't a full
 * fix: Yoga's auto-sizing for an absolutely-positioned child isn't fully decoupled from its
 * positioned ancestor's current size either, which under-measures and clips real content
 * (confirmed: "1 online" was rendering as "1 o" once the row had fully collapsed, from a
 * slightly-too-small reserved box). A sibling that the shrinking box's own size can never
 * feed back into has no such loop to fall into.
 */
function TitleBarSlot({
  content,
  scale,
  onNaturalWidth,
}: {
  content: ReactNode;
  scale: Animated.WithAnimatedValue<number>;
  /** Reports this slot's natural (pre-scale) width up to `ModuleTitleBar`, so it can keep
   * the centered title's own box from ever overlapping either slot - see there. */
  onNaturalWidth?: (width: number) => void;
}) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  if (!content) return null;

  // Swallows taps so they don't fall through to whatever Pressable wraps the whole header
  // (the collapsed frame's tap-to-go-back, or a tile's tap-to-open) - the same idiom already
  // used below for a collapsed frame's nested child.
  const inner = (
    <Pressable onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {content}
    </Pressable>
  );

  return (
    <>
      <View
        style={{ position: 'absolute', opacity: 0 }}
        pointerEvents="none"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setNaturalSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
          onNaturalWidth?.(width);
        }}
      >
        {inner}
      </View>
      <Animated.View
        style={{
          width: naturalSize ? Animated.multiply(scale, naturalSize.width) : undefined,
          height: naturalSize ? Animated.multiply(scale, naturalSize.height) : undefined,
          overflow: 'hidden',
        }}
      >
        {/* No maxWidth cap here (tried once, reverted): it constrains this box to less than
            the visible inner's natural size whenever content is wide enough to need it, and
            the visible inner is a normal in-flow child of this box (unlike the measuring
            copy above, which is an out-of-flow sibling specifically so it's immune to this) -
            so capping this box also squeezes the inner's own layout width, wrapping/clipping
            real content instead of cleanly cropping it. Confirmed: the online badge started
            getting cut off on its right and bottom edges under real use.

            transformOrigin is 'left top' rather than the RN default (center): `scale`
            shrinks `inner` around whatever point transformOrigin names, but the outer box
            above is sized and positioned as a LEFT/TOP-anchored footprint
            (`naturalSize * scale`, flush against this slot's own top-left corner in the
            row). Scaling around the center would shrink inner toward the midpoint of its
            full natural-size box instead of toward that corner, so the visible (post-scale)
            content drifts away from the outer box's actual bounds as scale shrinks - exactly
            the clipped-pill-with-a-gap-beside-it seen in production (right and bottom edges
            cut off, since the content overshoots the box on those sides while the top/left
            seem fine only by coincidence of having nowhere to drift past 0). Anchoring the
            scale at the same corner the outer box is anchored at keeps the visible content
            exactly filling the outer box at every point in the animation, left slot or right
            slot alike. */}
        <Animated.View style={{ transform: [{ scale }], transformOrigin: 'left top' }}>{inner}</Animated.View>
      </Animated.View>
    </>
  );
}

/** The title text itself, factored out of `ModuleTitleBar` so the bar's layout and the
 * title's own styling are two separate concerns. Purely presentational - all the sizing it
 * needs (font size, color) comes from the bar around it. */
function ModuleTitleBarTitle({
  fg,
  title,
  fontSize,
}: {
  fg: string;
  title: string;
  fontSize: Animated.WithAnimatedValue<number>;
}) {
  return (
    <Animated.Text numberOfLines={1} style={{ fontSize, fontWeight: '700', color: fg, textAlign: 'center' }}>
      {title}
    </Animated.Text>
  );
}

/**
 * Lays out a module's title bar: optional displays on the left, optional action buttons on
 * the right, the title centered. Shared by the collapsed, open and fullscreen render modes
 * below - each just passes either Animated interpolations (collapsed/open, so the bar
 * shrinks in sync with the title as the module collapses) or plain static numbers
 * (fullscreen, which has no parent to collapse in response to) for the sizing fields;
 * Animated.View/Text accept either in the same style object.
 *
 * The title is centered on the *whole bar*, not just the leftover space between the two
 * slots: it's rendered as a layer absolutely positioned over the bar's content box
 * (`position: 'relative'` is React Native's default, so no extra style is needed to anchor
 * it there), while displays/actions sit in a normal flex row underneath with an invisible
 * flexible spacer between them. That keeps the title dead-center regardless of how wide the
 * two slots are relative to each other. `pointerEvents="none"` on the title layer keeps it
 * from stealing taps meant for the slots underneath (or the collapsed frame's
 * tap-to-go-back) - the title itself has never been tappable here, unlike in tile mode.
 *
 * The title layer's own `left`/`right` insets aren't pinned to 0 - each slot reports its own
 * natural (pre-scale) width up via `onNaturalWidth`, and both insets are set to
 * `scale * max(leftWidth, rightWidth)`, not each side's own width. Using the same (larger)
 * value on *both* sides is what keeps the title's available box centered and symmetric
 * (instead of off-center toward whichever slot happens to be narrower) while guaranteeing it
 * never overlaps either slot: a title long enough to reach that inset now truncates
 * (`numberOfLines` on `ModuleTitleBarTitle`) instead of rendering on top of a chip - title
 * text is arbitrary data (e.g. a household's own name), not layout the two slots can be
 * assumed to leave room for on their own.
 *
 * `barMinHeight` reserves enough vertical space for the title's own line height even when
 * both slots are empty - without it, an empty flex row has no content to size itself by, the
 * bar would collapse to just its padding, and the absolutely-positioned title (which spans
 * the content box's actual height) would get squeezed into that near-zero space instead of
 * reading at its intended font size. `justifyContent: 'center'` on the outer box then keeps
 * the slot row vertically centered within that reserved height too, so a display/action chip
 * and the title row's own vertical middle - not pinned to the top with the title centered
 * below it.
 */
function ModuleTitleBar({
  fg,
  title,
  displays,
  actions,
  paddingTop,
  paddingBottom,
  paddingHorizontal,
  fontSize,
  barMinHeight,
  scale,
}: {
  fg: string;
  title: string;
  displays: ReactNode;
  actions: ReactNode;
  paddingTop: Animated.WithAnimatedValue<number>;
  paddingBottom: Animated.WithAnimatedValue<number>;
  paddingHorizontal: Animated.WithAnimatedValue<number>;
  fontSize: Animated.WithAnimatedValue<number>;
  barMinHeight: Animated.WithAnimatedValue<number>;
  scale: Animated.WithAnimatedValue<number>;
}) {
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);
  // 0 (not the last-measured width) whenever a slot has no content, so a slot that's
  // currently empty never reserves space for content it last had before being cleared.
  const maxSideWidth = Math.max(displays ? leftWidth : 0, actions ? rightWidth : 0);
  // A flat (unscaled) gap on top of the slot's own width, only when a slot is actually
  // present - otherwise a maxed-out title would truncate flush against a chip's edge with
  // zero breathing room, since the title zone's edge and the chip's own box edge would
  // otherwise land at exactly the same point.
  const sideInset = maxSideWidth > 0 ? Animated.add(Animated.multiply(scale, maxSideWidth), 8) : 0;

  return (
    <Animated.View
      style={{ paddingTop, paddingBottom, paddingHorizontal, minHeight: barMinHeight, justifyContent: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TitleBarSlot content={displays} scale={scale} onNaturalWidth={setLeftWidth} />
        <View style={{ flex: 1 }} />
        <TitleBarSlot content={actions} scale={scale} onNaturalWidth={setRightWidth} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, left: sideInset, right: sideInset, alignItems: 'center', justifyContent: 'center' }}
      >
        <ModuleTitleBarTitle fg={fg} title={title} fontSize={fontSize} />
      </Animated.View>
    </Animated.View>
  );
}

/** Rounded "chip" box for a title bar display or action - the same pastel-fill-with-a-
 * colored-border treatment `cardSurface` gives a whole card, scaled down into a pill. Standard
 * container for anything that sits in `titleBarDisplays`/`titleBarActions`, e.g. the online-
 * count badge, so the title bar reads as one consistent visual language instead of each caller
 * inventing its own badge style. Pass `onPress` to make the chip itself tappable (it's still
 * wrapped by `TitleBarSlot`'s own tap-swallowing Pressable, same as any other title bar
 * content); omit it for a purely informational chip. */
export function TitleBarChip({
  color,
  onPress,
  disabled,
  children,
}: {
  color: string;
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const box = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: pastelize(color),
        borderWidth: 2,
        borderColor: color,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </View>
  );
  if (!onPress) return box;
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {box}
    </Pressable>
  );
}

/**
 * Everything the app calls a "module" - a small tappable grid tile, the card it opens into,
 * the shrunk title-bar frame that card becomes when one of its own submodules opens on top of
 * it, and a full-bleed fullscreen/kiosk display - are all one component, not separate ones
 * that happen to look related: big cards and small cards are the same thing.
 *
 * Pick a mode with `tile`/`fullscreen`/`collapsed` (in that priority): none of them set means
 * the default "open card" mode. `titleBarDisplays` (read-only content) and `titleBarActions`
 * (buttons) both sit in the title bar next to the title - the title itself is already the
 * original example of a title bar action, since tapping it (a tile, or a collapsed frame)
 * navigates to that module.
 *
 * Every open/collapsed instance also plays a one-time entrance animation: it measures its own
 * on-screen box once laid out, then scales/translates in from wherever the tile that opened it
 * was (via cardX/Y/W/H route params) - or slides up from the bottom when there's no origin,
 * e.g. on first load. Measuring the real destination (instead of assuming full screen) keeps
 * this correct however deep the card ends up nested. Tile and fullscreen instances skip this -
 * a tile IS the origin, and a fullscreen display has no frame to expand from.
 *
 * There's no back button: returning to a parent card is done by tapping its visible collapsed
 * frame (see `collapsed`/`onCollapsedPress`), not a dedicated control.
 *
 * When scrollable and active (not collapsed), the colored card itself is the scroll content -
 * not a fixed-size box with a scroller glued inside it - so it only gets as tall as its content
 * needs, and the bottom rounded corners only come into view once you've actually scrolled to
 * the real end, instead of being clipped at a fixed viewport height.
 */
export function Module({
  title,
  color,
  textColor,
  href,
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
  /** Read-only content in the title bar (e.g. a status badge). Stays visible and shrinks with the title as the module collapses. */
  titleBarDisplays?: ReactNode;
  /** Buttons in the title bar next to the title. Shrinks with the title as the module collapses. */
  titleBarActions?: ReactNode;
  children?: ReactNode;
}) {
  // Entrance/exit choreography and the collapse animation only apply to the "card" modes
  // (collapsed frame and open card) - a tile has nothing to animate in from (it IS the
  // origin), and a fullscreen display has no parent frame to shrink into or expand from.
  const isCardMode = !tile && !fullscreen;

  const params = useLocalSearchParams<{ cardX?: string; cardY?: string; cardW?: string; cardH?: string }>();
  // Only actually read in tile mode (see onTilePress below), but called unconditionally -
  // same as every other hook here - to satisfy the rules of hooks regardless of mode.
  const pathname = usePathname();
  const containerRef = useRef<View>(null);
  const [dest, setDest] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [collapseAnim] = useState(() => new Animated.Value(collapsed ? 1 : 0));
  // Tile mode only (see below) - the tile's own rendered width, so the title's inset can be
  // given as a definite number rather than a percentage. A percentage `width` on the
  // title's wrapper View never resolved against the tile's actual size here (confirmed by
  // inspecting the rendered layout: it fell back to shrink-to-content, i.e. 0 width plus
  // whatever padding was set) even though the tile itself has a perfectly definite width by
  // the time it renders (TileGrid gives each tile an explicit numeric `width` style) - a
  // plain numeric `width` resolves correctly where the equivalent percentage didn't.
  const [tileWidth, setTileWidth] = useState<number | null>(null);

  const hasOrigin = params.cardX !== undefined;

  useEffect(() => {
    if (!isCardMode) return;
    const raf = requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        setDest({ x, y, w: width, h: height });
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dest) return;
    Animated.timing(progress, { toValue: 1, duration: 280, useNativeDriver: true }).start(() => {
      Animated.timing(contentOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
    // Entrance only ever plays once, from wherever this card was opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest !== null]);

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
    activeCardExit = exit;
    return () => {
      if (activeCardExit === exit) activeCardExit = null;
    };
  }, [isCardMode, collapsed, contentOpacity, progress]);

  const originX = hasOrigin ? Number(params.cardX) : dest ? dest.x : 0;
  const originY = hasOrigin ? Number(params.cardY) : dest ? dest.y + dest.h : 0;
  const originW = hasOrigin ? Number(params.cardW) : dest ? dest.w : 1;
  const originH = hasOrigin ? Number(params.cardH) : 90;

  // The entrance animation always targets this card's fixed viewport slot (measured
  // above), regardless of how tall the actual scrollable content inside ends up being.
  const scaleX = dest ? progress.interpolate({ inputRange: [0, 1], outputRange: [originW / dest.w, 1] }) : 1;
  const scaleY = dest ? progress.interpolate({ inputRange: [0, 1], outputRange: [originH / dest.h, 1] }) : 1;
  const translateX = dest
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originX + originW / 2 - (dest.x + dest.w / 2), 0],
      })
    : 0;
  const translateY = dest
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originY + originH / 2 - (dest.y + dest.h / 2), 0],
      })
    : 0;

  const fg = textColor ?? (color === 'white' ? '#111827' : color);

  // A small mid-transition settle - as the title shrinks or grows, the frame dips slightly
  // (down while shrinking, up while growing) instead of the content just snapping into the
  // newly-freed space the instant padding/font-size finish animating. Returns to 0 at both
  // ends (collapseAnim 0 and 1) so it never leaves a permanent offset at rest - only a bump
  // in the middle of the transition.
  const settleTranslateY = collapseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, 0] });
  const transform = [{ translateX }, { translateY }, { scaleX }, { scaleY }, { translateY: settleTranslateY }];

  // Once collapsed into a frame around a nested card, the title is no longer the main
  // focus - shrink it and reclaim most of the space it used to take up. Driven off the
  // same collapseAnim as contentMargin above, so it eases in both directions: shrinking
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
  // ratio) regardless of whether displays/actions are present - see ModuleTitleBar.
  const titleBarMinHeight = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [28 * 1.4, 14 * 1.4] });
  // Title bar displays/actions shrink at roughly the same ratio the title's own font size
  // does (14/28 = 0.5), just slightly less aggressively so small buttons/badges stay legible.
  const titleBarScale = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });
  const header = (
    <ModuleTitleBar
      fg={fg}
      title={title}
      displays={titleBarDisplays}
      actions={titleBarActions}
      paddingTop={titlePaddingTop}
      paddingBottom={titlePaddingBottom}
      paddingHorizontal={titlePaddingHorizontal}
      fontSize={titleFontSize}
      barMinHeight={titleBarMinHeight}
      scale={titleBarScale}
    />
  );

  if (tile) {
    const onTilePress = () => {
      if (disabled || !href) return;
      containerRef.current?.measureInWindow((x, y, width, height) => {
        const cardParams = { cardX: String(x), cardY: String(y), cardW: String(width), cardH: String(height) };
        if (entersFreshDynamicSegment(pathname, href)) {
          navigateToHref(href, cardParams);
        } else {
          router.push({ pathname: href as never, params: cardParams });
        }
      });
    };

    // Both tile corners are absolutely positioned overlays, not in-flow siblings of the
    // centered title text below - on purpose, so a tile's title sits at the same height
    // whether or not that particular tile happens to have a corner badge, keeping every
    // tile's title row aligned across a grid. That means the title itself has to stay clear
    // of whichever corners are actually populated, rather than the corners making room for
    // it. A single corner badge (today, every tile that sets one - the Screensaver "Start"
    // action, a disabled tile's "Coming soon") has shipped fine with no inset: short title
    // text next to one small pill doesn't reach it. Both corners at once (new as of house
    // tiles getting an online-count display alongside the existing default-house star) is
    // the combination that previously visually collided with the title on anything but a
    // very wide tile - so only that combination reserves horizontal clearance (both sides,
    // not just whichever single side has content, which would shift the title off-center -
    // see ModuleTitleBar for the same symmetric-inset reasoning at the card-header level),
    // and shrinks the font slightly to buy back some of the room the clearance costs -
    // between the two, a narrow 2-column phone tile (where every pixel is scarce; a 5-column
    // desktop tile has room to spare) still reliably avoids colliding with either badge.
    //
    // The inset is a fixed px number, not a `%`/`'100%'`-based one, and the title is wrapped
    // in a `View` explicitly sized to the tile's own *measured* width (`tileWidth` state,
    // above) rather than relying on the Text's own shrink-to-fit sizing or a percentage
    // width to establish that box: both were tried and, per actual rendered layout
    // (inspected directly, not guessed at) resolved to zero content width plus whatever
    // padding was set, instead of the tile's real available width - a React Native Web
    // quirk with percentage sizing in this nested-flex position, not a logic bug. A plain
    // number resolves correctly where the equivalent `%`/`'100%'` didn't. `overflow:
    // 'hidden'` on that same wrapper is a hard backstop against any further overflow -
    // title text is arbitrary data (a household's own name), so there's no guarantee any
    // fixed clearance is generous enough for every possible name at every tile width.
    const hasLeftBadge = disabled || !!titleBarDisplays;
    const hasRightBadge = !disabled && !!titleBarActions;
    const bothBadges = hasLeftBadge && hasRightBadge;
    const titleInset = bothBadges ? 46 : 0;
    const titleFontSize = bothBadges ? 15 : 17;
    // Subtracts the Pressable's own `padding: 16` on both sides, matching the box the title
    // actually renders inside.
    const tileContentWidth = tileWidth !== null ? tileWidth - 32 : undefined;

    return (
      <Pressable
        ref={containerRef}
        onPress={onTilePress}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          setTileWidth((prev) => (prev === width ? prev : width));
        }}
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
        <View style={{ width: tileContentWidth, paddingHorizontal: titleInset, overflow: 'hidden' }}>
          <Text numberOfLines={3} style={{ fontSize: titleFontSize, fontWeight: '700', color, textAlign: 'center' }}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2, textAlign: 'center' }}>{subtitle}</Text>
        ) : null}

        {/* Left corner is the display slot, same as the title bar row in card mode - "Coming
            soon" is a read-only status for an inactive module, not an action, so it belongs
            here. Right stays reserved exclusively for titleBarActions (real buttons), never
            a display, so the two can never land in the same corner. Both corners cap at 45%
            of the tile's own width (percentage resolves against the tile, the nearest
            positioned ancestor) with overflow hidden - on a small tile from a dense grid
            column count, fixed-size badge content must never spill past the tile's edge. */}
        {disabled ? (
          <View style={{ position: 'absolute', top: 10, left: 10, maxWidth: '45%', overflow: 'hidden' }}>
            <TitleBarChip color="#6b7280">
              <Text numberOfLines={1} style={{ color: '#6b7280', fontSize: 11, fontWeight: '700' }}>Coming soon</Text>
            </TitleBarChip>
          </View>
        ) : titleBarDisplays ? (
          <View style={{ position: 'absolute', top: 10, left: 10, maxWidth: '45%', overflow: 'hidden' }}>
            <Pressable onPress={() => {}}>{titleBarDisplays}</Pressable>
          </View>
        ) : null}

        {!disabled && titleBarActions ? (
          <View style={{ position: 'absolute', top: 10, right: 10, maxWidth: '45%', overflow: 'hidden' }}>
            <Pressable onPress={() => {}}>{titleBarActions}</Pressable>
          </View>
        ) : null}
      </Pressable>
    );
  }

  if (fullscreen) {
    const showBar = !!(titleBarDisplays || titleBarActions);
    return (
      <View style={{ flex: 1 }}>
        {children}
        {/* No title text here - a floating "Screensaver" label would visually compete with
            the clock overlay this kiosk display already renders as its own content. Only
            displays/actions (if any) show, anchored clear of that top-left corner. */}
        {showBar ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {titleBarDisplays ? (
              <Pressable onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {titleBarDisplays}
              </Pressable>
            ) : null}
            {titleBarActions ? (
              <Pressable onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {titleBarActions}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (collapsed) {
    return (
      <View ref={containerRef} style={{ flex: 1, margin: CARD_MARGIN }} collapsable={false}>
        <Animated.View
          style={{
            flex: 1,
            ...cardSurface(color),
            ...oppositeCorners(28),
            overflow: 'hidden',
            opacity: dest ? 1 : 0,
            transform,
          }}
        >
          <Pressable onPress={onCollapsedPress} style={{ flex: 1 }}>
            {header}
            {/* No margin here - the nested card (children) is itself a Module, which
                already carries its own CARD_MARGIN on every side. Adding a second margin
                layer on top of that would double up the gap between this frame's border and
                the nested card's border, well past what the shrunk title actually frees up. */}
            <View style={{ flex: 1, ...oppositeCorners(20), overflow: 'hidden' }}>
              {/* Swallows taps anywhere inside the nested card so they don't fall through
                  to the backdrop Pressable above and bounce back out to this level. */}
              <Pressable style={{ flex: 1 }} onPress={() => {}}>
                {children}
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const card = (
    <View
      style={{
        minHeight: scroll ? '100%' : undefined,
        flex: scroll ? undefined : 1,
        ...cardSurface(color),
        ...oppositeCorners(28),
        overflow: 'hidden',
      }}
    >
      {header}
      <Animated.View style={{ flex: scroll ? undefined : 1, paddingHorizontal: 24, paddingBottom: 24, gap: 12, opacity: contentOpacity }}>
        {children}
      </Animated.View>
    </View>
  );

  return (
    <View ref={containerRef} style={{ flex: 1, margin: CARD_MARGIN }} collapsable={false}>
      <Animated.View style={{ flex: 1, opacity: dest ? 1 : 0, transform }}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ minHeight: '100%' }}
            showsVerticalScrollIndicator={false}
          >
            {card}
          </ScrollView>
        ) : (
          card
        )}
      </Animated.View>
    </View>
  );
}
