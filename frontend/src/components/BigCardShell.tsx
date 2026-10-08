import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

/**
 * Standard screen chrome for the card-based navigation. Plays a two-stage entrance:
 * 1) the card itself (title included) scales/translates up from wherever the SubCard
 *    that opened it was on screen (or slides up from the bottom if there's no origin,
 *    e.g. the Dashboard itself) to fill the screen.
 * 2) once expanded, the screen's own content fades in underneath the title.
 */
export function BigCardShell({
  title,
  backLabel = 'Back',
  showBack = true,
  scroll = true,
  children,
}: {
  title: string;
  backLabel?: string;
  showBack?: boolean;
  /** Set false when children manage their own scrolling (e.g. a FlatList) to avoid nesting scrollers. */
  scroll?: boolean;
  children: ReactNode;
}) {
  const params = useLocalSearchParams<{ cardX?: string; cardY?: string; cardW?: string; cardH?: string }>();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const hasOrigin = params.cardX !== undefined;
  const originX = hasOrigin ? Number(params.cardX) : 0;
  const originY = hasOrigin ? Number(params.cardY) : screenH;
  const originW = hasOrigin ? Number(params.cardW) : screenW;
  const originH = hasOrigin ? Number(params.cardH) : 90;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 280, useNativeDriver: true }).start(() => {
      Animated.timing(contentOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
    // Entrance only ever plays once, from whatever origin this screen was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scaleX = progress.interpolate({ inputRange: [0, 1], outputRange: [originW / screenW, 1] });
  const scaleY = progress.interpolate({ inputRange: [0, 1], outputRange: [originH / screenH, 1] });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [originX + originW / 2 - screenW / 2, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [originY + originH / 2 - screenH / 2, 0],
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#e5e7eb' }}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: 28,
          overflow: 'hidden',
          transform: [{ translateX }, { translateY }, { scaleX }, { scaleY }],
        }}
      >
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 16 }}>
          {showBack ? (
            <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}>
              <Text style={{ color: '#2563eb', fontWeight: '600' }}>← {backLabel}</Text>
            </Pressable>
          ) : null}
          <Text style={{ fontSize: 28, fontWeight: '700' }}>{title}</Text>
        </View>

        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          {scroll ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 12 }}>
              {children}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: 24, gap: 12 }}>{children}</View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}
