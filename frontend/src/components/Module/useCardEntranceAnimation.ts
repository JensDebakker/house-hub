import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type RefObject } from 'react';
import { Animated, type View } from 'react-native';

/**
 * Plays a module card's one-time entrance animation: measures its own on-screen box once
 * laid out, then scales/translates in from wherever the tile that opened it was (via
 * cardX/Y/W/H route params) - or slides up from the bottom when there's no origin, e.g. on
 * first load. Measuring the real destination (instead of assuming full screen) keeps this
 * correct however deep the card ends up nested. Only relevant in card mode (collapsed frame
 * or open card) - a tile has nothing to animate in from, and fullscreen has no frame to
 * expand from - so `isCardMode` gates every effect here, but the hook itself still always
 * runs (same as every other hook) to satisfy the rules of hooks regardless of mode.
 */
export const useCardEntranceAnimation = (containerRef: RefObject<View | null>, isCardMode: boolean) => {
  const params = useLocalSearchParams<{ cardX?: string; cardY?: string; cardW?: string; cardH?: string }>();
  const [dest, setDest] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(0));

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

  return { dest, progress, contentOpacity, scaleX, scaleY, translateX, translateY };
};
