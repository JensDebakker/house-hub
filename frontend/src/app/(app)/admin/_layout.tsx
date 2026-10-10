import { router, Slot, usePathname } from 'expo-router';
import { Module, navigateBackFromCard } from '@/components/Module';

const ADMIN_COLOR = '#6b7280';

// Same pattern as House: this card stays mounted for as long as any /admin/* route is
// open, and collapses into a gray frame around Users/Houses (and their own nested detail
// screens, which carry on collapsing the same way one level further via their own cards).
export default function AdminLayout() {
  const pathname = usePathname();
  const collapsed = pathname !== '/admin';

  return (
    <Module
      title="Admin"
      color={ADMIN_COLOR}
      collapsed={collapsed}
      onCollapsedPress={() => navigateBackFromCard(() => router.replace('/admin'))}
    >
      <Slot />
    </Module>
  );
}
