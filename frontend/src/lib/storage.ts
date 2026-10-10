import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens } from '@/types';

const TOKENS_KEY = 'house-hub.auth-tokens';
const PENDING_INVITE_CODE_KEY = 'house-hub.pending-invite-code';
const SCREENSAVER_LAYOUT_KEY = 'house-hub.screensaver-layout';
const SCREENSAVER_AUTOSTART_KEY = 'house-hub.screensaver-autostart';

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKENS_KEY);
}

/** Remembers an invite code from a `/join` link clicked while logged out, so it can be
 * applied once login/registration completes - see `joinPendingHousehold`. */
export async function savePendingInviteCode(code: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_CODE_KEY, code);
}

export async function loadPendingInviteCode(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_INVITE_CODE_KEY);
}

export async function clearPendingInviteCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
}

export type ScreensaverElementId = 'time' | 'date' | 'calendar' | 'chat';
export type ScreensaverCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ScreensaverLayoutPrefs {
  elements: Record<ScreensaverElementId, { enabled: boolean; corner: ScreensaverCorner }>;
}

export interface ScreensaverAutoStartPrefs {
  enabled: boolean;
  idleTimeoutMinutes: number;
}

/** Reproduces today's hardcoded screensaver behavior: a single clock block (time above
 * date) stacked top-left, calendar/chat overlays off until the user opts in. */
const DEFAULT_SCREENSAVER_LAYOUT_PREFS: ScreensaverLayoutPrefs = {
  elements: {
    time: { enabled: true, corner: 'top-left' },
    date: { enabled: true, corner: 'top-left' },
    calendar: { enabled: false, corner: 'top-right' },
    chat: { enabled: false, corner: 'top-right' },
  },
};

export async function saveScreensaverLayoutPrefs(prefs: ScreensaverLayoutPrefs): Promise<void> {
  await AsyncStorage.setItem(SCREENSAVER_LAYOUT_KEY, JSON.stringify(prefs));
}

export async function loadScreensaverLayoutPrefs(): Promise<ScreensaverLayoutPrefs> {
  const raw = await AsyncStorage.getItem(SCREENSAVER_LAYOUT_KEY);
  return raw ? (JSON.parse(raw) as ScreensaverLayoutPrefs) : DEFAULT_SCREENSAVER_LAYOUT_PREFS;
}

/** Matches today's hardcoded `(app)/_layout.tsx` idle-redirect: enabled, 2 minute timeout. */
const DEFAULT_SCREENSAVER_AUTOSTART_PREFS: ScreensaverAutoStartPrefs = {
  enabled: true,
  idleTimeoutMinutes: 2,
};

export async function saveScreensaverAutoStartPrefs(prefs: ScreensaverAutoStartPrefs): Promise<void> {
  await AsyncStorage.setItem(SCREENSAVER_AUTOSTART_KEY, JSON.stringify(prefs));
}

export async function loadScreensaverAutoStartPrefs(): Promise<ScreensaverAutoStartPrefs> {
  const raw = await AsyncStorage.getItem(SCREENSAVER_AUTOSTART_KEY);
  return raw ? (JSON.parse(raw) as ScreensaverAutoStartPrefs) : DEFAULT_SCREENSAVER_AUTOSTART_PREFS;
}
