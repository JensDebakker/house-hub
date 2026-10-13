import { Slot } from 'expo-router';

// Plain pass-through, same pattern as house/_layout.tsx: start.tsx is the only route left
// under this top-level group (its sibling settings screens - the overview, Layout,
// AutoStart - moved to house/[householdId]/screensaver/ so they nest in the house's own
// card stack like any other feature tile). This group stays a separate top-level
// Stack.Screen (see app/_layout.tsx) purely so the kiosk display can escape all card
// chrome and take over the whole screen - an explicit Slot here (instead of leaving this
// folder to an auto-generated implicit native-stack navigator) opts back out of that
// navigator's own per-screen state, which doesn't understand this app's "same dynamic
// segment, different id" navigation pattern (see lib/navigation.ts).
export default function ScreensaverLayout() {
  return <Slot />;
}
