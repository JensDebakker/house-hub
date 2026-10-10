import { api } from '@/lib/api';
import type { HouseholdMembership, User } from '@/types';

/**
 * Sets the caller's default household. The backend (`PATCH /households/{householdId}/default`,
 * landing on a separate branch in parallel with this one) returns a refreshed membership list,
 * but its exact shape wasn't settled yet as this was written - every call site here just
 * `refreshUser()`s afterward (re-fetching `/auth/me`) rather than trusting this response, so
 * it stays correct regardless of what that endpoint ends up returning.
 */
export async function setDefaultHousehold(householdId: string): Promise<void> {
  await api.patch(`/households/${householdId}/default`);
}

/** The household login/`/` should land a user in: whichever membership is flagged
 * `isDefault`, falling back to the first membership, falling back to `undefined` (no
 * households at all) - callers redirect to the Houses overview (`/dashboard`) in that
 * last case instead of crashing on a missing household. */
export function resolveDefaultHousehold(user: User | null | undefined): HouseholdMembership | undefined {
  return user?.households.find((h) => h.isDefault) ?? user?.households[0];
}
