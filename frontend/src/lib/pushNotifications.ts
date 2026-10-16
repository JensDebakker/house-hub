import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { translate } from '@/i18n';
import { api } from '@/lib/api';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const PREFS_KEY = 'house-hub.push-preferences';

export interface PushPreferences {
  notifyOnVersion: boolean;
  notifyOnChatMessage: boolean;
}

// notifyOnChatMessage defaults on when a subscription is first created - "push
// notifications: on" reads most naturally as "notify me about things". notifyOnVersion
// defaults off instead: a new-version push fires on every deploy, which is frequent
// enough that most people would rather opt in deliberately than opt back out of it.
const DEFAULT_PREFS: PushPreferences = { notifyOnVersion: false, notifyOnChatMessage: true };

/** True once Chrome/Android (or any browser with the standard Push API) can actually
 * subscribe this page to push. iOS Safari only gets here once installed to the home
 * screen on iOS 16.4+; plain browser tabs and unsupported browsers never will. */
export function isPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** The two notification-type toggles are stored locally rather than fetched from the
 * backend: a push subscription (and therefore its toggle state) is inherently a property
 * of this one browser/device, this is the only place that ever sets them, and skipping a
 * GET round-trip keeps the backend contract to just subscribe/update/unsubscribe. */
function loadPrefs(): PushPreferences {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<PushPreferences>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: PushPreferences): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be blocked - preferences just won't survive a reload, not fatal.
  }
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/** Called from AuthContext's logout - a push subscription lives at the browser/device
 * level, not the account level, so without this a shared device would keep showing
 * "push notifications: on" for whoever logs in next even though the backend row (and
 * its toggle preferences) still belong to the user who just logged out: `usePushNotifications`
 * derives `enabled` purely from whether this browser has ANY subscription object, with no
 * way to tell one account's subscription apart from another's on the same device. Clearing
 * it on every logout - not just when the user explicitly disables it - is what keeps that
 * derivation honest. Must run before the caller clears auth tokens, since the backend
 * DELETE needs a still-valid one; its own failure is still non-fatal; the browser-side
 * unsubscribe() is what actually matters for stopping delivery and must always happen. */
export async function clearPushSubscriptionOnLogout(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const subscription = await getExistingSubscription();
    if (subscription) {
      try {
        await api.delete('/push/subscriptions', { params: { endpoint: subscription.endpoint } });
      } catch {
        // Best effort - see function doc. A row orphaned here self-heals: it 404/410s
        // the next time a push is attempted against it, and PushNotificationService
        // deletes it then.
      }
      await subscription.unsubscribe();
    }
  } catch {
    // Must never block logout itself.
  }
  try {
    window.localStorage.removeItem(PREFS_KEY);
  } catch {
    // Ignore - see loadPrefs/savePrefs for why storage failures are non-fatal here.
  }
}

function toSubscribeRequest(subscription: PushSubscription, prefs: PushPreferences) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    notifyOnVersion: prefs.notifyOnVersion,
    notifyOnChatMessage: prefs.notifyOnChatMessage,
  };
}

/** Drives the App module's "Push notifications" master toggle plus its two sub-toggles.
 * Web-only (native builds have no Web Push concept) and only meaningful while signed in,
 * since subscribing calls an authenticated endpoint - callers gate rendering accordingly. */
export function usePushNotifications() {
  const supported = isPushSupported();
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<PushPreferences>(() => (supported ? loadPrefs() : DEFAULT_PREFS));
  // Mirrors `prefs`, updated synchronously (not waiting for React's render cycle) so two
  // setPreference calls fired back-to-back before a re-render each see the OTHER's change
  // instead of both computing their "next" value from the same stale `prefs` closure and
  // silently reverting one of them.
  // Kept in sync by explicit assignment at every call site that also calls setPrefs (never
  // read/written during render) - see enablePush and setPreference.
  const prefsRef = useRef(prefs);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getExistingSubscription().then((subscription) => {
      if (!cancelled) setEnabled(subscription !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enablePush = async (): Promise<void> => {
    if (!supported || busy) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPermissionDenied(permission === 'denied');
        return;
      }
      setPermissionDenied(false);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's DOM lib types `Uint8Array` as generic over `ArrayBufferLike`, but
        // `PushSubscriptionOptionsInit.applicationServerKey` wants one backed specifically
        // by `ArrayBuffer` - a real mismatch only in the type system, since `new
        // Uint8Array(n)` is always backed by a plain ArrayBuffer at runtime.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      await api.post('/push/subscriptions', toSubscribeRequest(subscription, DEFAULT_PREFS));
      savePrefs(DEFAULT_PREFS);
      prefsRef.current = DEFAULT_PREFS;
      setPrefs(DEFAULT_PREFS);
      setEnabled(true);
    } catch {
      // Covers both a browser-side subscribe() failure (e.g. the push service is
      // unreachable) and a backend POST failure. Without this, either one was an
      // unhandled promise rejection that left the toggle silently back at "off" with no
      // explanation - confirmed via a real failure during manual testing, not a
      // hypothetical: Chromium's Push API throws exactly this way when it refuses to
      // subscribe for reasons `Notification.requestPermission()` alone doesn't surface.
      setError(translate('app.push.enableFailed'));
      // Best-effort cleanup: if the browser-side subscribe() succeeded but the backend
      // POST failed, don't leave an orphaned subscription the UI has no way to show or
      // retry from - unsubscribe so the next attempt starts clean.
      try {
        const existing = await getExistingSubscription();
        await existing?.unsubscribe();
      } catch {
        // Best effort only.
      }
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        try {
          await api.delete('/push/subscriptions', { params: { endpoint: subscription.endpoint } });
        } catch {
          // The browser-side unsubscribe below still proceeds either way - a push
          // service can't deliver to an endpoint the browser itself has unsubscribed
          // from, and a subscription row orphaned server-side by this failure will
          // self-heal: PushNotificationService deletes it the next time a send to it
          // comes back 404/410.
        }
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  const setPreference = async (key: keyof PushPreferences, value: boolean): Promise<void> => {
    // Reads/writes prefsRef, not the `prefs` state value directly - two calls fired back
    // to back before a re-render would otherwise both read the same stale `prefs` closure
    // and the second call's save would silently revert the first's change.
    const nextPrefs = { ...prefsRef.current, [key]: value };
    prefsRef.current = nextPrefs;
    setPrefs(nextPrefs);
    savePrefs(nextPrefs);

    const subscription = await getExistingSubscription();
    if (!subscription) return;
    try {
      await api.patch('/push/subscriptions', { endpoint: subscription.endpoint, [key]: value });
    } catch {
      // Best effort - local state already reflects the user's choice; a transient failure
      // here just means it'll reconcile next time this subscription is (re-)created.
    }
  };

  return {
    supported,
    enabled,
    busy,
    permissionDenied,
    error,
    notifyOnVersion: prefs.notifyOnVersion,
    notifyOnChatMessage: prefs.notifyOnChatMessage,
    enablePush,
    disablePush,
    setNotifyOnVersion: (value: boolean) => setPreference('notifyOnVersion', value),
    setNotifyOnChatMessage: (value: boolean) => setPreference('notifyOnChatMessage', value),
  };
}
