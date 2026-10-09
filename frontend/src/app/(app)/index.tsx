import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { BigCardShell } from '@/components/BigCardShell';
import { SubCard } from '@/components/SubCard';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;

  return (
    <BigCardShell title={`Welcome${user ? `, ${user.displayName}` : ''}`} showBack={false}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexBasis: '47%', flexGrow: 1 }}>
          <SubCard title="Tasks" subtitle="Routine chores" href="/tasks" color="#2563eb" disabled />
        </View>
        <View style={{ flexBasis: '47%', flexGrow: 1 }}>
          <SubCard title="Shopping" subtitle="Lists" href="/shopping" color="#059669" disabled />
        </View>
        <View style={{ flexBasis: '47%', flexGrow: 1 }}>
          <SubCard title="Supplies" subtitle="Medical & stock" href="/supplies" color="#b45309" disabled />
        </View>
        <View style={{ flexBasis: '47%', flexGrow: 1 }}>
          <SubCard title="Calendar" subtitle="House events" href="/calendar" color="#7c3aed" disabled />
        </View>
        <View style={{ flexBasis: '47%', flexGrow: 1 }}>
          <SubCard title="Files" subtitle="Shared uploads" href="/files" color="#0891b2" />
        </View>
        <View style={{ flexBasis: '47%', flexGrow: 1 }}>
          <SubCard title="Settings" subtitle="Account & house" href="/settings" color="#64748b" />
        </View>
        {user?.role === 'ADMIN' ? (
          <View style={{ flexBasis: '47%', flexGrow: 1 }}>
            <SubCard title="Admin" subtitle="Manage everything" href="/admin" color="#dc2626" />
          </View>
        ) : null}
      </View>

      {householdId ? (
        <Link href={{ pathname: '/screensaver/[householdId]', params: { householdId } }} style={{ color: '#2563eb' }}>
          Open the screensaver preview →
        </Link>
      ) : (
        <Text style={{ color: '#999' }}>Join or create a house to preview the screensaver.</Text>
      )}
    </BigCardShell>
  );
}
