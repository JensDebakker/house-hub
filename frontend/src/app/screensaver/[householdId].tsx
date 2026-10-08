import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Placeholder slides until the backend serves real household photos.
const SLIDES = [
  { color: '#1d4ed8', caption: 'Family trip' },
  { color: '#059669', caption: 'Weekend BBQ' },
  { color: '#b45309', caption: 'Birthday party' },
];

const SLIDE_DURATION_MS = 6000;
const IDLE_TIMEOUT_MS = 10000;

export default function ScreensaverScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const [slideIndex, setSlideIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [controlsVisible, setControlsVisible] = useState(true);
  const cardAnim = useRef(new Animated.Value(1)).current;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const slideTimer = setInterval(
      () => setSlideIndex((i) => (i + 1) % SLIDES.length),
      SLIDE_DURATION_MS,
    );
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(slideTimer);
      clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: controlsVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible]);

  const scheduleHide = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setControlsVisible(false), IDLE_TIMEOUT_MS);
  };

  const wake = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  // Start the initial idle countdown on mount.
  useEffect(() => {
    scheduleHide();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // Mouse movement only makes sense on web - touch/click are handled by the
  // Pressable wrapper below on every platform.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.addEventListener('mousemove', wake);
    return () => window.removeEventListener('mousemove', wake);
  }, []);

  const slide = SLIDES[slideIndex];

  return (
    <Pressable style={{ flex: 1, backgroundColor: slide.color }} onPress={wake}>
      <StatusBar hidden />

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
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '600' }}>{slide.caption}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Household: {householdId}
            </Text>
          </View>

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
  );
}
