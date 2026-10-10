import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { isInAppBrowser } from '@/lib/inAppBrowser';

type Status = 'idle' | 'copied' | 'failed';

/** There's no reliable way to force an escape from Facebook/Instagram's in-app browser via
 * JS - custom-scheme tricks are inconsistently blocked by it. `navigator.share()` triggers
 * the OS's own native share sheet though, which on both iOS and Android includes an "Open
 * in Safari/Chrome" style option directly - a real button the user can tap, rather than
 * instructions to go hunt for the browser's own ••• menu.
 *
 * Unlike `InviteLinkButton`'s web path (which skips `navigator.share` because desktop
 * browser support is inconsistent), this banner only ever renders behind `isInAppBrowser()`,
 * which is itself a mobile-only user-agent match - so the Share API is reliably present here
 * even though "web" in general can't assume that. Falls back to copy-link, and if even that
 * fails, to the same "•••" menu instructions the original version always showed - this must
 * never leave the user with strictly less help than before. */
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
      } catch (err) {
        // The user dismissing the share sheet on purpose isn't a failure - leave it alone.
        if (err instanceof Error && err.name === 'AbortError') return;
        // Otherwise the Share API claimed support but didn't actually work - fall through.
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('copied');
    } catch {
      setStatus('failed');
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
      <Text style={{ color: '#92400e', flex: 1 }}>
        {status === 'failed'
          ? 'Tap the ••• menu and choose "Open in Safari/Chrome" instead.'
          : 'This page can get stuck loading in here.'}
      </Text>
      {status === 'failed' ? null : (
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
      )}
      <Pressable onPress={() => setVisible(false)} hitSlop={8}>
        <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}
