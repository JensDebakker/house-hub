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
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  href: string;
  color?: string;
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
          backgroundColor: color,
          borderRadius: 20,
          padding: 20,
          aspectRatio: 0.95,
          flex: 1,
          justifyContent: 'flex-end',
          overflow: 'hidden',
        },
        disabled && { opacity: 0.35 },
        !disabled && pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: 'white' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
      ) : null}

      {disabled ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
        >
          <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Coming soon</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
