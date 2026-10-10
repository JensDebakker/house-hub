import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDefaultHousehold } from '@/lib/households';

// "/" has no screen of its own - it hands off to the signed-in user's default house's
// dashboard, or the Houses overview itself if they somehow have no household yet.
export default function AppIndexRedirect() {
  const { user } = useAuth();
  const defaultHousehold = resolveDefaultHousehold(user);
  return <Redirect href={defaultHousehold ? `/house/${defaultHousehold.householdId}/dashboard` : '/dashboard'} />;
}
