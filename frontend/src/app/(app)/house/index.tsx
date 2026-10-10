import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDefaultHousehold } from '@/lib/households';

// Bare "/house" has no screen of its own anymore - the per-house tile grid that used to
// live here moved to house/[householdId]/house.tsx. Kept as a redirect (instead of
// removing the route outright) so old links/deep links to "/house" still land somewhere
// useful instead of 404ing.
export default function HouseIndexRedirect() {
  const { user } = useAuth();
  const defaultHousehold = resolveDefaultHousehold(user);
  return <Redirect href={defaultHousehold ? `/house/${defaultHousehold.householdId}/dashboard` : '/dashboard'} />;
}
