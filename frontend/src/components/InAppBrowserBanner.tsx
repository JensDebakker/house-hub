import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { isInAppBrowser } from '@/lib/inAppBrowser';

type Status = 'idle' | 'copied';

/** There's no reliable way to force an escape from Facebook/Instagram's in-app browser via
 * JS - custom-scheme tricks are inconsistently blocked by it. `navigator.share()` triggers
 * the OS's own native share sheet though, which on both iOS and Android includes an "Open
 * in Safari/Chrome" style option directly - a real button the user can tap, rather than
 * instructions to go hunt for the browser's own ••• menu. Falls back to a copy-link button
 * on browsers/WebViews where the Share API isn't available (or the user dismisses it). */
export function InAppBrowserBanner() {
  const [visible, setVisible] = useState(() => Platform.OS === 'web' && isInAppBrowser());
  const [status, setStatus] = useState<Status>('idle');

  if (!visible) return null;

  const onOpenInBrowser = async () => {
    const share = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share;
    if (share) {
      try {
        await share({ url: window.location.href });
        return;
      } catch {
        // Cancelled, or the Share API isn't actually usable here - fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('copied');
    } catch {
      // Nothing more we can do - dismiss is still available.
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#fef3c7',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Text style={{ color: '#92400e', flex: 1 }}>This page can get stuck loading in here.</Text>
      <Pressable
        onPress={onOpenInBrowser}
        style={{
          backgroundColor: '#92400e',
          borderRadius: 8,
          paddingVertical: 8,
          paddingHorizontal: 14,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>
          {status === 'copied' ? 'Link copied!' : 'Open in browser'}
        </Text>
      </Pressable>
      <Pressable onPress={() => setVisible(false)} hitSlop={8}>
        <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}
