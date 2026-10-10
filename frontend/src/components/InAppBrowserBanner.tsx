import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { isInAppBrowser } from '@/lib/inAppBrowser';

/** There's no reliable way to force an escape from Facebook/Instagram's in-app browser via
 * JS - custom-scheme tricks are inconsistently blocked by it. Its own "Open in
 * Safari"/"Open in Chrome" option (behind the ••• menu) is the one dependable way out, so
 * this just points people at it instead of pretending to fix it for them. */
export function InAppBrowserBanner() {
  const [visible, setVisible] = useState(() => Platform.OS === 'web' && isInAppBrowser());
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Nothing more we can do - the instructions below still stand on their own.
    }
  };

  return (
    <View style={{ backgroundColor: '#fef3c7', padding: 10, gap: 6 }}>
      <Text style={{ color: '#92400e', textAlign: 'center' }}>
        You&apos;re viewing this inside Facebook/Instagram&apos;s built-in browser, which can
        cause pages like invite links to get stuck. Tap the ••• menu and choose &quot;Open in
        Safari&quot;/&quot;Open in Chrome&quot;, or copy the link below and paste it into your
        own browser.
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <Pressable onPress={onCopyLink}>
          <Text style={{ color: '#92400e', fontWeight: '600' }}>
            {copied ? 'Link copied!' : 'Copy this link'}
          </Text>
        </Pressable>
        <Pressable onPress={() => setVisible(false)}>
          <Text style={{ color: '#92400e', fontWeight: '600' }}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}
