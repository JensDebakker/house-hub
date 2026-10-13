import { router, Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { Module, navigateBackFromCard } from '@/components/Module';

const AUTH_COLOR = '#2563eb';

// Same pattern as (app)/_layout.tsx's Dashboard card: "House Hub" is the base of this
// stack's own card hierarchy, staying mounted and collapsing into a frame around whichever
// auth screen (Log in, Register, the App module, ...) is currently open on top of it.
// index.tsx is this group's own Level 0 - its own route resolves to "/" (group folders
// aren't part of the URL), same as (app)'s Dashboard resolving to "/dashboard".
export default function AuthLayout() {
  const pathname = usePathname();
  const collapsed = pathname !== '/';

  return (
    <View style={{ flex: 1, backgroundColor: '#e5e7eb' }}>
      <Module
        title="House Hub"
        color={AUTH_COLOR}
        collapsed={collapsed}
        onCollapsedPress={() => navigateBackFromCard(() => router.replace('/'))}
      >
        <Slot />
      </Module>
    </View>
  );
}
