import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setOnAuthFailure } from '@/lib/api';
import { clearTokens, loadTokens, saveTokens } from '@/lib/storage';
import type { AuthTokens, HouseholdMembership, User } from '@/types';

type LoginResponse = AuthTokens & { user: User };

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<User>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  /** Re-fetches the current user from the backend and updates context state - use after
   * anything that changes `user.households` server-side (create/join/leave a household). */
  refreshUser: () => Promise<User>;
  /** Patches just `user.households` from an already-fetched membership list (e.g. the
   * `PATCH .../default` response) instead of a full `refreshUser()` round-trip - a no-op
   * if there's no signed-in user to patch. */
  setHouseholds: (households: HouseholdMembership[]) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setOnAuthFailure(() => setUser(null));

    (async () => {
      const tokens = await loadTokens();
      if (tokens) {
        try {
          const { data } = await api.get<User>('/auth/me');
          setUser(data);
        } catch {
          await clearTokens();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  };

  // Registration no longer logs the user in - the account must be email-verified first.
  const register = async (email: string, password: string, displayName: string) => {
    await api.post('/auth/register', { email, password, displayName });
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
  };

  // Verifying is treated as an implicit login - no separate login step needed afterward.
  const verifyEmail = async (token: string) => {
    const { data } = await api.post<LoginResponse>('/auth/verify-email', { token });
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
    return data.user;
  };

  const forgotPassword = async (email: string) => {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return data.message;
  };

  const resetPassword = async (token: string, newPassword: string) => {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword });
    return data.message;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
    return data.message;
  };

  const refreshUser = async () => {
    const { data } = await api.get<User>('/auth/me');
    setUser(data);
    return data;
  };

  const setHouseholds = (households: HouseholdMembership[]) => {
    setUser((prev) => (prev ? { ...prev, households } : prev));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      verifyEmail,
      forgotPassword,
      resetPassword,
      changePassword,
      refreshUser,
      setHouseholds,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
