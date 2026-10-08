import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Household } from '@/types';

const COLS = {
  name: 180,
  members: 90,
  tasks: 80,
  supplies: 90,
  shopping: 100,
  calendar: 90,
  files: 80,
  storage: 160,
  created: 160,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function AdminHousesScreen() {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get<Household[]>('/admin/households');
        setHouseholds(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load households.'));
      }
    })();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Houses</Text>
        <Text>You don&apos;t have access to this page.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Houses</Text>
      <Link href="/admin" style={{ color: '#2563eb' }}>
        ← Back to users
      </Link>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.name}>Name</HeaderCell>
          <HeaderCell width={COLS.members}>Members</HeaderCell>
          <HeaderCell width={COLS.tasks}>Tasks</HeaderCell>
          <HeaderCell width={COLS.supplies}>Supplies</HeaderCell>
          <HeaderCell width={COLS.shopping}>Shopping</HeaderCell>
          <HeaderCell width={COLS.calendar}>Calendar</HeaderCell>
          <HeaderCell width={COLS.files}>Files</HeaderCell>
          <HeaderCell width={COLS.storage}>Storage</HeaderCell>
          <HeaderCell width={COLS.created}>Created</HeaderCell>
        </HeaderRow>

        {households.map((h, index) => (
          <Row key={h.id} index={index}>
            <Cell width={COLS.name}>
              <Link href={`/admin/houses/${h.id}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                {h.name}
              </Link>
            </Cell>
            <Cell width={COLS.members}><Text>{h.memberCount}</Text></Cell>
            <Cell width={COLS.tasks}><Text>{h.taskCount}</Text></Cell>
            <Cell width={COLS.supplies}><Text>{h.supplyCount}</Text></Cell>
            <Cell width={COLS.shopping}><Text>{h.shoppingListCount}</Text></Cell>
            <Cell width={COLS.calendar}><Text>{h.calendarEventCount}</Text></Cell>
            <Cell width={COLS.files}><Text>{h.fileCount}</Text></Cell>
            <Cell width={COLS.storage}>
              <Text>{formatBytes(h.storageUsedBytes)} / {formatBytes(h.storageLimitBytes)}</Text>
            </Cell>
            <Cell width={COLS.created}>
              <Text style={{ color: '#666' }}>{new Date(h.createdAt).toLocaleDateString()}</Text>
            </Cell>
          </Row>
        ))}
      </TableContainer>
    </ScrollView>
  );
}
