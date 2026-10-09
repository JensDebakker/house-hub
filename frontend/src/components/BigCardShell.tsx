import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

const COLLAPSED_MARGIN = 18;
const CARD_MARGIN = 10;

/**
 * Screen chrome for the card-based navigation, and also the building block for the
 * "stack of cards" pattern: Dashboard and House render themselves as a BigCardShell that
 * stays mounted and switches into `collapsed` mode whenever one of their own sub-routes is
 * open, shrinking into a colored frame (with its title still showing) around the nested
 * card instead of disappearing. Tapping that frame jumps straight back to it.
 *
 * Every instance also plays a one-time entrance animation: it measures its own on-screen
 * box once laid out, then scales/translates in from wherever the SubCard that opened it
 * was (via cardX/Y/W/H route params) - or slides up from the bottom when there's no origin,
 * e.g. on first load. Measuring the real destination (instead of assuming full screen)
 * keeps this correct however deep the card ends up nested.
 *
 * There's no back button: returning to a parent card is done by tapping its visible
 * collapsed frame (see `collapsed`/`onCollapsedPress`), not a dedicated control.
 *
 * When scrollable and active (not collapsed), the colored card itself is the scroll
 * content - not a fixed-size box with a scroller glued inside it - so it only gets as tall
 * as its content needs, and the bottom rounded corners only come into view once you've
 * actually scrolled to the real end, instead of being clipped at a fixed viewport height.
 */
export function BigCardShell({
  title,
  color = 'white',
  textColor,
  collapsed = false,
  onCollapsedPress,
  scroll = true,
  children,
}: {
  title: string;
  color?: string;
  textColor?: string;
  /** True while one of this card's own sub-routes is open on top of it. */
  collapsed?: boolean;
  /** Called when the collapsed frame (anywhere outside the nested card) is tapped. */
  onCollapsedPress?: () => void;
  /** Set false when children manage their own scrolling (e.g. a FlatList) to avoid nesting scrollers. */
  scroll?: boolean;
  children: ReactNode;
}) {
  const params = useLocalSearchParams<{ cardX?: string; cardY?: string; cardW?: string; cardH?: string }>();
  const containerRef = useRef<View>(null);
  const [dest, setDest] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [collapseAnim] = useState(() => new Animated.Value(collapsed ? 1 : 0));

  const hasOrigin = params.cardX !== undefined;

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        setDest({ x, y, w: width, h: height });
      });
    });
    return () => cancelAnimationFrame(raf);
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

  const contentMargin = collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, COLLAPSED_MARGIN] });
  const fg = textColor ?? (color === 'white' ? '#111827' : '#ffffff');
  const transform = [{ translateX }, { translateY }, { scaleX }, { scaleY }];

  // Once collapsed into a frame around a nested card, the title is no longer the
  // main focus - shrink it and reclaim most of the space it used to take up.
  const header = collapsed ? (
    <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: fg }}>{title}</Text>
    </View>
  ) : (
    <View style={{ paddingTop: 32, paddingHorizontal: 24, paddingBottom: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: fg }}>{title}</Text>
    </View>
  );

  if (collapsed) {
    return (
      <View ref={containerRef} style={{ flex: 1, margin: CARD_MARGIN }} collapsable={false}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: color,
            borderRadius: 28,
            overflow: 'hidden',
            opacity: dest ? 1 : 0,
            transform,
          }}
        >
          <Pressable onPress={onCollapsedPress} style={{ flex: 1 }}>
            {header}
            <Animated.View style={{ flex: 1, margin: contentMargin, borderRadius: 20, overflow: 'hidden' }}>
              {/* Swallows taps anywhere inside the nested card so they don't fall through
                  to the backdrop Pressable above and bounce back out to this level. */}
              <Pressable style={{ flex: 1 }} onPress={() => {}}>
                {children}
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const card = (
    <View style={{ minHeight: scroll ? '100%' : undefined, flex: scroll ? undefined : 1, backgroundColor: color, borderRadius: 28, overflow: 'hidden' }}>
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
