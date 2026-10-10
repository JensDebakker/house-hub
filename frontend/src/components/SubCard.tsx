import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { oppositeCorners, pastelize } from '@/lib/color';

/**
 * A tappable menu tile. On press, measures its own on-screen position and carries it
 * along as route params so the destination screen (wrapped in BigCardShell) can animate
 * expanding outward from exactly where this tile was, instead of a generic transition.
 */
export function SubCard({
  title,
  subtitle,
  href,
  color,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  href: string;
  color: string;
  /** Renders a dimmed, non-navigating tile with a "Coming soon" overlay for features not wired up yet. */
  disabled?: boolean;
}) {
  const ref = useRef<View>(null);

  const onPress = () => {
    if (disabled) return;
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
        {
          backgroundColor: pastelize(color),
          borderWidth: 2,
          borderColor: color,
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

      {disabled ? (
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Coming soon</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
