import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

/** Centers content and caps its width so phone/tablet/web layouts all stay readable. */
export function ScreenContainer({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const contentStyle = {
    width: '100%' as const,
    maxWidth: 640,
    alignSelf: 'center' as const,
    padding: 16,
    gap: 12,
  };

  if (!scroll) {
    return <View style={[{ flex: 1 }, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={contentStyle}>
      {children}
    </ScrollView>
  );
}
