import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Placeholder slides until the backend serves real household photos.
const SLIDES = [
  { color: '#1d4ed8', caption: 'Family trip' },
  { color: '#059669', caption: 'Weekend BBQ' },
  { color: '#b45309', caption: 'Birthday party' },
];

const SLIDE_DURATION_MS = 6000;

export default function ScreensaverScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const [slideIndex, setSlideIndex] = useState(0);
  const [now, setNow] = useState(new Date());

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

  const slide = SLIDES[slideIndex];

  return (
    <View style={{ flex: 1, backgroundColor: slide.color }}>
      <StatusBar hidden />

      <View style={{ position: 'absolute', top: 32, left: 32 }}>
        <Text style={{ color: 'white', fontSize: 48, fontWeight: '700' }}>
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={{ color: 'white', fontSize: 18 }}>
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <View style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '600' }}>{slide.caption}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
          Household: {householdId}
        </Text>
      </View>
    </View>
  );
}
