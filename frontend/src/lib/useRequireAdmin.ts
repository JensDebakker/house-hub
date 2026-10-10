import { useAuth } from '@/contexts/AuthContext';

/**
 * Shared access-guard for the admin screens: resolves whether the signed-in user is
 * allowed to see admin content. Each screen still renders its own "no access" fallback
 * (and decides for itself whether to skip its data fetch) - this just centralizes the
 * `role === 'ADMIN'` check that was previously repeated verbatim in every admin screen.
 */
export function useRequireAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'ADMIN';
}
