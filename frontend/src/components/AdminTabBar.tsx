import { Link, usePathname } from 'expo-router';
import { ScrollView } from 'react-native';

const TABS = [
  { href: '/admin', label: 'Users' },
  { href: '/admin/houses', label: 'Houses' },
  { href: '/admin/tasks', label: 'Tasks' },
  { href: '/admin/supplies', label: 'Supplies' },
  { href: '/admin/shopping-lists', label: 'Shopping Lists' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/files', label: 'Files' },
] as const;

export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', flexGrow: 0 }}
      contentContainerStyle={{ padding: 12, gap: 8 }}
    >
      {TABS.map((tab) => {
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: '600',
              backgroundColor: active ? '#2563eb' : '#eef2ff',
              color: active ? '#fff' : '#2563eb',
              overflow: 'hidden',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </ScrollView>
  );
}
