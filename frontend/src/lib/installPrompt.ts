import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Chrome/Android's install prompt - not yet a standard DOM type. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Registered as a side effect of importing this module (see _layout.tsx), not inside
// useInstallPrompt below - beforeinstallprompt fires once per page load, at the browser's
// own discretion, and is lost for good if nothing was listening in time. The hook's
// consumer (the App module) isn't mounted until the user navigates to it, so capturing
// the event can't wait for that.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Stop Chrome's default mini-infobar - the App module's own button is the only
    // install UI shown.
    event.preventDefault();
    deferredEvent = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    notify();
  });
}

/** iPhone/iPod, or an iPad running iPadOS 13+ - which reports as desktop Safari in its user
 * agent, but (unlike an actual Mac) exposes multi-touch. Either way, `beforeinstallprompt`
 * never fires there - Safari's share-sheet "Add to Home Screen" is the only install path,
 * so the App module needs to point there explicitly instead of leaving a dead end. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** True once the app is already running installed (standalone window, no browser chrome) -
 * covers both the standard Display Mode Media Query (Chrome/Android) and iOS Safari's older,
 * non-standard `navigator.standalone` flag. Either way there's nothing left to prompt for. */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Whether Chrome/Android's install prompt is currently available, and a function to
 * trigger it. Web-only: iOS Safari never fires `beforeinstallprompt` (users add to home
 * screen manually via the share sheet) and native builds have no concept of it, so
 * `available` is always false off web. */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(Platform.OS === 'web' && deferredEvent !== null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const update = () => setAvailable(deferredEvent !== null);
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!deferredEvent) return null;
    await deferredEvent.prompt();
    // The event can only be used once either way, whether the user accepts or declines.
    const { outcome } = await deferredEvent.userChoice;
    deferredEvent = null;
    notify();
    return outcome;
  };

  return { available, promptInstall };
}
