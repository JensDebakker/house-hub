import { create, isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearTokens, loadTokens, saveTokens } from '@/lib/storage';
import type { AuthTokens } from '@/types';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export const api = create({ baseURL: BASE_URL });

// Plain axios instance (no interceptors) so the refresh call itself can't recurse.
const refreshClient = create({ baseURL: BASE_URL });

let onAuthFailure: (() => void) | null = null;
/** Registered once by AuthContext so a failed refresh can trigger logout. */
export function setOnAuthFailure(callback: () => void): void {
  onAuthFailure = callback;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const tokens = await loadTokens();
  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return config;
});

let refreshPromise: Promise<AuthTokens | null> | null = null;

function refreshTokensDeduped(): Promise<AuthTokens | null> {
  refreshPromise ??= refreshTokens().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function refreshTokens(): Promise<AuthTokens | null> {
  const current = await loadTokens();
  if (!current?.refreshToken) return null;

  try {
    const { data } = await refreshClient.post<AuthTokens>('/auth/refresh', {
      refreshToken: current.refreshToken,
    });
    await saveTokens(data);
    return data;
  } catch {
    return null;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64-decodes to a UTF-8 string without relying on `atob` (not reliably present in
 * React Native/Hermes) or `Buffer` (a Node global, not available on web/native without a
 * polyfill) - plain JS so this works identically on every platform this app ships on. */
function base64Decode(input: string): string {
  const clean = input.replace(/=+$/u, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  const bytesArray = new Uint8Array(bytes);
  let result = '';
  let i = 0;
  while (i < bytesArray.length) {
    const byte1 = bytesArray[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 < 0xe0) {
      const byte2 = bytesArray[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 < 0xf0) {
      const byte2 = bytesArray[i++];
      const byte3 = bytesArray[i++];
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
    } else {
      const byte2 = bytesArray[i++];
      const byte3 = bytesArray[i++];
      const byte4 = bytesArray[i++];
      const codepoint =
        ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
      result += String.fromCodePoint(codepoint);
    }
  }
  return result;
}

/** Decodes a JWT's `exp` claim (Unix seconds) without a library. Returns `null` if the
 * token can't be decoded - callers should then treat it as valid, since the backend
 * remains the source of truth on actual validity; this is purely a client-side
 * optimization to avoid sending a token we already know is stale. */
function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = base64Decode(base64);
    const claims = JSON.parse(json) as { exp?: number };
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

/** Buffer so a token that's about to expire gets refreshed proactively rather than
 * being handed out and expiring mid-use (e.g. during a websocket handshake). */
const EXPIRY_BUFFER_SECONDS = 10;

/** Returns an access token known not to be expired, refreshing first if needed -
 * consistent with the REST 401 flow above, but usable by callers (like the websocket
 * reconnect loop) that can't rely on a 401 to trigger that refresh. Returns `null` if
 * there are no tokens at all, or refresh fails (in which case it also clears tokens and
 * triggers `onAuthFailure`, same as the REST interceptor does). */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens?.accessToken) return null;

  const exp = decodeJwtExpiry(tokens.accessToken);
  if (exp === null || exp * 1000 > Date.now() + EXPIRY_BUFFER_SECONDS * 1000) {
    return tokens.accessToken;
  }

  const refreshed = await refreshTokensDeduped();
  if (!refreshed) {
    await clearTokens();
    onAuthFailure?.();
    return null;
  }
  return refreshed.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    const refreshed = await refreshTokensDeduped();
    if (!refreshed) {
      await clearTokens();
      onAuthFailure?.();
      return Promise.reject(error);
    }

    originalRequest.headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
    return api.request(originalRequest);
  },
);

/** Backend error responses are always `{ message: string, ... }` - fall back for anything else (network errors, etc). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}
