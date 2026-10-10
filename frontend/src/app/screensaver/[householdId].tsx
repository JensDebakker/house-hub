import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Module } from '@/components/Module';
import { api } from '@/lib/api';
import type { HouseFile } from '@/types';

const SLIDE_DURATION_MS = 6000;
const IDLE_TIMEOUT_MS = 10000;
const FALLBACK_BACKGROUND = '#111827';
const SCREENSAVER_COLOR = '#7c3aed';

export default function ScreensaverScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const [slideUrls, setSlideUrls] = useState<string[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cardAnim] = useState(() => new Animated.Value(1));
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Images uploaded to the house's Files panel double as screensaver slides - loaded as
  // blob URLs since a plain <img src> can't carry the Authorization header the file
  // endpoint needs. Web only for now (blob: URIs aren't valid Image sources on native).
  useEffect(() => {
    if (!householdId || Platform.OS !== 'web') return;
    let cancelled = false;
    const createdUrls: string[] = [];

    (async () => {
      try {
        const { data } = await api.get<HouseFile[]>(`/households/${householdId}/files`);
        const images = data.filter((f) => f.contentType.startsWith('image/'));
        const urls = await Promise.all(
          images.map(async (f) => {
            const res = await api.get(`/households/${householdId}/files/${f.id}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data as Blob);
            createdUrls.push(url);
            return url;
          }),
        );
        if (!cancelled) setSlideUrls(urls);
      } catch {
        // No images yet, or not reachable from here - the plain background is fine.
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [householdId]);

  useEffect(() => {
    if (slideUrls.length === 0) return;
    const slideTimer = setInterval(
      () => setSlideIndex((i) => (i + 1) % slideUrls.length),
      SLIDE_DURATION_MS,
    );
    return () => clearInterval(slideTimer);
  }, [slideUrls.length]);

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: controlsVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, cardAnim]);

  const scheduleHide = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setControlsVisible(false), IDLE_TIMEOUT_MS);
  }, []);

  const wake = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Start the initial idle countdown on mount.
  useEffect(() => {
    scheduleHide();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [scheduleHide]);

  // Mouse movement only makes sense on web - touch/click are handled by the
  // Pressable wrapper below on every platform.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.addEventListener('mousemove', wake);
    return () => window.removeEventListener('mousemove', wake);
  }, [wake]);

  const currentSlideUrl = slideUrls[slideIndex];

  return (
    <Module fullscreen title="Screensaver" color={SCREENSAVER_COLOR}>
      <Pressable style={{ flex: 1, backgroundColor: FALLBACK_BACKGROUND }} onPress={wake}>
        <StatusBar hidden />

        {currentSlideUrl ? (
          <Image
            key={currentSlideUrl}
            source={{ uri: currentSlideUrl }}
            resizeMode="cover"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}

        <View style={{ position: 'absolute', top: 32, left: 32 }}>
          <Text style={{ color: 'white', fontSize: 48, fontWeight: '700' }}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={{ color: 'white', fontSize: 18 }}>
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <Animated.View
          pointerEvents={controlsVisible ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            bottom: 32,
            left: 32,
            right: 32,
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderRadius: 16,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <Link
              href="/"
              style={{
                color: 'white',
                fontWeight: '600',
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              Open House Hub →
            </Link>
          </View>
        </Animated.View>
      </Pressable>
    </Module>
  );
}
