import { api } from '@/lib/api';
import type { HouseholdMembership, User } from '@/types';

/**
 * Sets the caller's default household. Returns the refreshed membership list the backend
 * responds with (`PATCH /households/{householdId}/default`) - pass it straight to
 * `useAuth().setHouseholds()` to update context state in place instead of a full
 * `refreshUser()` round-trip to `/auth/me`.
 */
export async function setDefaultHousehold(householdId: string): Promise<HouseholdMembership[]> {
  const { data } = await api.patch<HouseholdMembership[]>(`/households/${householdId}/default`);
  return data;
}

/** The household login/`/` should land a user in: whichever membership is flagged
 * `isDefault`, falling back to the first membership, falling back to `undefined` (no
 * households at all) - callers redirect to the Houses overview (`/dashboard`) in that
 * last case instead of crashing on a missing household. */
export function resolveDefaultHousehold(user: User | null | undefined): HouseholdMembership | undefined {
  return user?.households.find((h) => h.isDefault) ?? user?.households[0];
}

/** The current user's own membership in a specific household (by id) - e.g. to read
 * their role there, or that membership's own copy of the household's name. Shared by
 * every house/[householdId] screen that needs "my membership in *this* house" rather
 * than the user's households list as a whole, instead of each re-running the same
 * `.find()` against the route param. */
export function findHouseholdMembership(
  user: User | null | undefined,
  householdId: string | undefined,
): HouseholdMembership | undefined {
  return user?.households.find((h) => h.householdId === householdId);
}
