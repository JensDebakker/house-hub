import { AppModuleCard } from '@/components/AppModuleCard';

// Same route path as (app)/app.tsx ("/app", group segments aren't part of the URL) - only
// one of the two is ever actually registered at a time, per whichever Stack.Protected
// branch is active (see src/app/_layout.tsx), same technique already used for "/" colliding
// between (app)/index.tsx and (auth)/index.tsx. Lets a signed-out visitor install House Hub
// from the login screen's own App tile, without having to sign in first.
export default function AuthAppScreen() {
  return <AppModuleCard />;
}
