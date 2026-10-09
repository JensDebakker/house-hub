import { Redirect } from 'expo-router';

// "/" has no screen of its own - it always just hands off to the cards overview.
export default function AppIndexRedirect() {
  return <Redirect href="/dashboard" />;
}
