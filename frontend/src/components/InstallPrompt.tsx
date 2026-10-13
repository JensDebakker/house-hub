import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

const DISMISSED_KEY = 'house-hub.pwa-install-dismissed';

/** Chrome/Android's install prompt - not yet a standard DOM type. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** True once the app is already running installed (standalone window, no browser chrome) -
 * covers both the standard Display Mode Media Query (Chrome/Android) and iOS Safari's older,
 * non-standard `navigator.standalone` flag. Either way there's nothing left to prompt for. */
function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Dismissible "Install app" banner for Chrome/Android's `beforeinstallprompt` flow. Web-only:
 * iOS Safari never fires this event (there's no programmatic install prompt there - users add
 * to home screen manually via the share sheet), and native builds have no concept of it. */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => Platform.OS === 'web' && window.localStorage.getItem(DISMISSED_KEY) === '1'
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (dismissed) return;
    if (isRunningStandalone()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      // Stop Chrome's default mini-infobar so our own banner is the only install UI shown.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, [dismissed]);

  if (Platform.OS !== 'web' || dismissed || !deferredPrompt) return null;

  const onInstall = async () => {
    await deferredPrompt.prompt();
    // The event can only be used once either way, whether the user accepts or declines.
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const onDismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <View
      style={{
        backgroundColor: '#e0f2fe',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Text style={{ color: '#075985', flex: 1 }}>Install House Hub for quicker access from your home screen.</Text>
      <Pressable
        onPress={onInstall}
        style={{
          backgroundColor: '#0369a1',
          borderRadius: 8,
          paddingVertical: 8,
          paddingHorizontal: 14,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Install</Text>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Text style={{ color: '#075985', fontWeight: '700', fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}
