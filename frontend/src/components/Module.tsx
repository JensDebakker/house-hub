import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { oppositeCorners, pastelize } from '@/lib/color';

const CARD_MARGIN = 10;

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
}: {
  content: ReactNode;
  scale: Animated.WithAnimatedValue<number>;
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
        }}
      >
        {inner}
      </View>
      <Animated.View
        style={{
          width: naturalSize ? Animated.multiply(scale, naturalSize.width) : undefined,
          height: naturalSize ? Animated.multiply(scale, naturalSize.height) : undefined,
          // Caps how much of the row a single slot can claim regardless of its natural
          // content size, so unusually wide display/action content can't push the title
          // down to nothing (or past the card's own edge) on a narrow window - the title's
          // own flex: 1 absorbs whatever room this leaves it, down to its own text width.
          maxWidth: '35%',
          overflow: 'hidden',
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>{inner}</Animated.View>
      </Animated.View>
    </>
  );
}

/**
 * Lays out a module's title bar as a row: optional displays on the left, the title centered
 * and flexible in the middle, optional action buttons on the right. Shared by the collapsed,
 * open and fullscreen render modes below - each just passes either Animated interpolations
 * (collapsed/open, so the row shrinks in sync with the title as the module collapses) or
 * plain static numbers (fullscreen, which has no parent to collapse in response to) for the
 * sizing fields; Animated.View/Text accept either in the same style object.
 */
function renderHeaderRow({
  fg,
  title,
  displays,
  actions,
  paddingTop,
  paddingBottom,
  paddingHorizontal,
  fontSize,
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
  scale: Animated.WithAnimatedValue<number>;
}) {
  return (
    <Animated.View
      style={{ flexDirection: 'row', alignItems: 'center', paddingTop, paddingHorizontal, paddingBottom }}
    >
      <TitleBarSlot content={displays} scale={scale} />
      <Animated.Text style={{ flex: 1, fontSize, fontWeight: '700', color: fg, textAlign: 'center' }}>
        {title}
      </Animated.Text>
      <TitleBarSlot content={actions} scale={scale} />
    </Animated.View>
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
  const containerRef = useRef<View>(null);
  const [dest, setDest] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [collapseAnim] = useState(() => new Animated.Value(collapsed ? 1 : 0));

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
  const titlePaddingTop = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [14, CARD_MARGIN] });
  const titlePaddingBottom = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const titlePaddingHorizontal = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 16] });
  const titleFontSize = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 14] });
  // Title bar displays/actions shrink at roughly the same ratio the title's own font size
  // does (14/28 = 0.5), just slightly less aggressively so small buttons/badges stay legible.
  const titleBarScale = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });
  const header = renderHeaderRow({
    fg,
    title,
    displays: titleBarDisplays,
    actions: titleBarActions,
    paddingTop: titlePaddingTop,
    paddingBottom: titlePaddingBottom,
    paddingHorizontal: titlePaddingHorizontal,
    fontSize: titleFontSize,
    scale: titleBarScale,
  });

  if (tile) {
    const onTilePress = () => {
      if (disabled || !href) return;
      containerRef.current?.measureInWindow((x, y, width, height) => {
        router.push({
          pathname: href as never,
          params: { cardX: String(x), cardY: String(y), cardW: String(width), cardH: String(height) },
        });
      });
    };

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
        <Text style={{ fontSize: 17, fontWeight: '700', color, textAlign: 'center' }}>{title}</Text>
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
            <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text numberOfLines={1} style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Coming soon</Text>
            </View>
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
