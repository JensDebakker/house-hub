import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { Module } from '@/components/Module';
import { api, getErrorMessage } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { Household } from '@/types';

const HOUSES_COLOR = '#0f766e';

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
  const isAdmin = useRequireAdmin();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data } = await api.get<Household[]>('/admin/households');
        setHouseholds(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load houses.'));
      }
    })();
  }, [isAdmin]);

  const filteredHouseholds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return households;
    return households.filter((h) => h.name.toLowerCase().includes(query));
  }, [households, search]);

  if (!isAdmin) {
    return (
      <Module title="Houses" color={HOUSES_COLOR}>
        <Text>You don&apos;t have access to this page.</Text>
      </Module>
    );
  }

  return (
    <Module title="Houses" color={HOUSES_COLOR}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by house name…"
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, backgroundColor: 'white' }}
      />

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

        {filteredHouseholds.map((h, index) => (
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
    </Module>
  );
}
