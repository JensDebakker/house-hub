import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens } from '@/types';

const TOKENS_KEY = 'house-hub.auth-tokens';

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
