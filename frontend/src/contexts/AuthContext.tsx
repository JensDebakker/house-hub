import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setOnAuthFailure } from '@/lib/api';
import { clearTokens, loadTokens, saveTokens } from '@/lib/storage';
import type { AuthTokens, User } from '@/types';

type LoginResponse = AuthTokens & { user: User };

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
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
  };

  const register = async (email: string, password: string, displayName: string) => {
    const { data } = await api.post<LoginResponse>('/auth/register', {
      email,
      password,
      displayName,
    });
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, register, logout }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
