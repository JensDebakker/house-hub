import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Module } from '@/components/Module';
import { api } from '@/lib/api';
import {
  loadScreensaverLayoutPrefs,
  type ScreensaverCorner,
  type ScreensaverElementId,
  type ScreensaverLayoutPrefs,
} from '@/lib/storage';
import { useCalendarEventsQuery } from '@/lib/useCalendarEvents';
import { useChatMessagesQuery } from '@/lib/useChatMessages';
import type { HouseFile } from '@/types';

const SLIDE_DURATION_MS = 6000;
const IDLE_TIMEOUT_MS = 10000;
const FALLBACK_BACKGROUND = '#111827';
const SCREENSAVER_COLOR = '#7c3aed';

const CORNER_STYLE: Record<ScreensaverCorner, { position: 'absolute'; top?: number; bottom?: number; left?: number; right?: number }> = {
  'top-left': { position: 'absolute', top: 32, left: 32 },
  'top-right': { position: 'absolute', top: 32, right: 32 },
  'bottom-left': { position: 'absolute', bottom: 32, left: 32 },
  'bottom-right': { position: 'absolute', bottom: 32, right: 32 },
};

// Order elements sharing a corner stack in - time above date is the only pairing that
// matters today (it reproduces the old single clock block), the rest just keeps output
// stable.
const ELEMENT_ORDER: ScreensaverElementId[] = ['time', 'date', 'calendar', 'chat'];

function OverlayCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 16, padding: 16, maxWidth: 320 }}>
      {children}
    </View>
  );
}

function TimeWidget({ now }: { now: Date }) {
  return (
    <Text style={{ color: 'white', fontSize: 48, fontWeight: '700' }}>
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Text>
  );
}

function DateWidget({ now }: { now: Date }) {
  return (
    <Text style={{ color: 'white', fontSize: 18 }}>
      {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
    </Text>
  );
}

function CalendarWidget({ householdId, now }: { householdId: string | undefined; now: Date }) {
  const { data: events } = useCalendarEventsQuery(householdId);

  const upcoming = useMemo(() => {
    // Compare by calendar day, not exact instant - events are created from a plain
    // YYYY-MM-DD picker (see MonthGrid's `parseDateKey`) and stored at local midnight, so
    // an exact-timestamp comparison would wrongly drop "today"'s events as soon as the
    // clock ticks past midnight, even though they're still what a "today & next few days"
    // overlay should show for the rest of the day.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return (events ?? [])
      .filter((e) => new Date(e.start).getTime() >= startOfToday)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 4);
  }, [events, now]);

  if (upcoming.length === 0) return null;

  return (
    <OverlayCard>
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, marginBottom: 6 }}>Upcoming</Text>
      {upcoming.map((e) => (
        <Text key={e.id} style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }} numberOfLines={1}>
          {new Date(e.start).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {e.title}
        </Text>
      ))}
    </OverlayCard>
  );
}

function ChatWidget({ householdId }: { householdId: string | undefined }) {
  const { data: messages } = useChatMessagesQuery(householdId);
  const recent = (messages ?? []).slice(0, 4);

  if (recent.length === 0) return null;

  return (
    <OverlayCard>
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, marginBottom: 6 }}>House Chat</Text>
      {recent.map((m) => (
        <Text key={m.id} style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }} numberOfLines={1}>
          {m.senderDisplayName}: {m.text}
        </Text>
      ))}
    </OverlayCard>
  );
}

function renderElement(id: ScreensaverElementId, now: Date, householdId: string | undefined) {
  switch (id) {
    case 'time':
      return <TimeWidget now={now} />;
    case 'date':
      return <DateWidget now={now} />;
    case 'calendar':
      return <CalendarWidget householdId={householdId} now={now} />;
    case 'chat':
      return <ChatWidget householdId={householdId} />;
  }
}

export default function ScreensaverStartScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const [slideUrls, setSlideUrls] = useState<string[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cardAnim] = useState(() => new Animated.Value(1));
  const [layoutPrefs, setLayoutPrefs] = useState<ScreensaverLayoutPrefs | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadScreensaverLayoutPrefs().then(setLayoutPrefs);
  }, []);

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

  // Group enabled elements by their configured corner, in a stable order, so elements
  // sharing a corner stack vertically instead of overlapping.
  const cornerGroups = useMemo(() => {
    const groups: Record<ScreensaverCorner, ScreensaverElementId[]> = {
      'top-left': [],
      'top-right': [],
      'bottom-left': [],
      'bottom-right': [],
    };
    if (!layoutPrefs) return groups;
    for (const id of ELEMENT_ORDER) {
      const config = layoutPrefs.elements[id];
      if (config?.enabled) groups[config.corner].push(id);
    }
    return groups;
  }, [layoutPrefs]);

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

        {(Object.keys(cornerGroups) as ScreensaverCorner[]).map((corner) => {
          const ids = cornerGroups[corner];
          if (ids.length === 0) return null;
          return (
            <View key={corner} style={{ ...CORNER_STYLE[corner], gap: 8 }}>
              {ids.map((id) => (
                <View key={id}>{renderElement(id, now, householdId)}</View>
              ))}
            </View>
          );
        })}

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
