import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

const COLLAPSED_MARGIN = 18;

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
 */
export function BigCardShell({
  title,
  color = 'white',
  textColor,
  isRoot = false,
  collapsed = false,
  onCollapsedPress,
  scroll = true,
  children,
}: {
  title: string;
  color?: string;
  textColor?: string;
  /** The outermost card (Dashboard) never shows a back arrow - there's nothing above it. */
  isRoot?: boolean;
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

  return (
    <View ref={containerRef} style={{ flex: 1 }} collapsable={false}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: color,
          borderRadius: 28,
          overflow: 'hidden',
          opacity: dest ? 1 : 0,
          transform: [{ translateX }, { translateY }, { scaleX }, { scaleY }],
        }}
      >
        <Pressable disabled={!collapsed} onPress={onCollapsedPress} style={{ flex: 1 }}>
          <View
            style={{
              paddingTop: 48,
              paddingHorizontal: 24,
              paddingBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {!isRoot && !collapsed ? (
              <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
                <Text style={{ color: fg, fontSize: 26, fontWeight: '700' }}>←</Text>
              </Pressable>
            ) : null}
            <Text style={{ fontSize: 28, fontWeight: '700', color: fg }}>{title}</Text>
          </View>

          <Animated.View style={{ flex: 1, margin: contentMargin }}>
            {collapsed ? (
              // Swallows taps anywhere inside the nested card so they don't fall through
              // to the backdrop Pressable above and bounce back out to this level.
              <Pressable style={{ flex: 1 }} onPress={() => {}}>
                {children}
              </Pressable>
            ) : scroll ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 12 }}>
                <Animated.View style={{ gap: 12, opacity: contentOpacity }}>{children}</Animated.View>
              </ScrollView>
            ) : (
              <Animated.View style={{ flex: 1, paddingHorizontal: 24, gap: 12, opacity: contentOpacity }}>
                {children}
              </Animated.View>
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
