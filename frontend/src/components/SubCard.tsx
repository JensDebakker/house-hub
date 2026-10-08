import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * A tappable menu tile. On press, measures its own on-screen position and carries it
 * along as route params so the destination screen (wrapped in BigCardShell) can animate
 * expanding outward from exactly where this tile was, instead of a generic transition.
 */
export function SubCard({
  title,
  subtitle,
  href,
  color = '#2563eb',
}: {
  title: string;
  subtitle?: string;
  href: string;
  color?: string;
}) {
  const ref = useRef<View>(null);

  const onPress = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      router.push({
        pathname: href as never,
        params: {
          cardX: String(x),
          cardY: String(y),
          cardW: String(width),
          cardH: String(height),
        },
      });
    });
  };

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: color, borderRadius: 20, padding: 20, minHeight: 110, justifyContent: 'flex-end' },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: 'white' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}
