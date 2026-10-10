import { api } from '@/lib/api';
import { clearPendingInviteCode, loadPendingInviteCode } from '@/lib/storage';
import type { Household, HouseholdJoinRequest } from '@/types';

/** Joins the household saved by a `/join` link clicked while logged out. Call this right
 * after login/email-verification completes, then `refreshUser()` if it returns a truthy
 * (non-null) id, so a join link followed without an account still ends in the user
 * joining that house. Returns the joined household's id (so a caller can route straight
 * to it) if a code was pending and the join call reached the backend at all - `null` if
 * there was no pending code to begin with. A join that actually failed server-side
 * (expired/invalid code, already a member, ...) still counts as "handled": the code is
 * cleared either way so it's not retried forever, but there's no household id to report
 * back for that case specifically. */
export async function joinPendingHousehold(): Promise<string | null> {
  const code = await loadPendingInviteCode();
  if (!code) return null;

  try {
    const { data } = await api.post<Household>('/households/join', { inviteCode: code } satisfies HouseholdJoinRequest);
    return data.id;
  } catch {
    // Already a member, invalid/expired code, etc. - nothing more to do with it.
    return null;
  } finally {
    await clearPendingInviteCode();
  }
}
