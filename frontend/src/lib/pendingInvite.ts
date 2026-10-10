import { api } from '@/lib/api';
import { clearPendingInviteCode, loadPendingInviteCode } from '@/lib/storage';
import type { HouseholdJoinRequest } from '@/types';

/** Joins the household saved by a `/join` link clicked while logged out. Call this right
 * after login/email-verification completes, then `refreshUser()` if it returns true, so a
 * join link followed without an account still ends in the user joining that house. */
export async function joinPendingHousehold(): Promise<boolean> {
  const code = await loadPendingInviteCode();
  if (!code) return false;

  try {
    await api.post('/households/join', { inviteCode: code } satisfies HouseholdJoinRequest);
  } catch {
    // Already a member, invalid/expired code, etc. - nothing more to do with it.
  } finally {
    await clearPendingInviteCode();
  }
  return true;
}
