import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens } from '@/types';

const TOKENS_KEY = 'house-hub.auth-tokens';
const PENDING_INVITE_CODE_KEY = 'house-hub.pending-invite-code';

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
