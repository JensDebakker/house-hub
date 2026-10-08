import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearTokens, loadTokens, saveTokens } from '@/lib/storage';
import type { AuthTokens } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export const api = axios.create({ baseURL: BASE_URL });

// Plain axios instance (no interceptors) so the refresh call itself can't recurse.
const refreshClient = axios.create({ baseURL: BASE_URL });

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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });

    const refreshed = await refreshPromise;
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
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}
