import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { AdminActionButton, Cell, HeaderCell, HeaderRow, Row, TableContainer } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { api, getErrorMessage } from '@/lib/api';
import { useRequireAdmin } from '@/lib/useRequireAdmin';
import type { AdminFile } from '@/types';

const COLS = {
  filename: 220,
  household: 160,
  size: 90,
  uploadedBy: 150,
  uploadedAt: 160,
  actions: 140,
};
const TABLE_WIDTH = Object.values(COLS).reduce((a, b) => a + b, 0);

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function downloadFile(householdId: string, fileId: string, filename: string) {
  const { data } = await api.get(`/households/${householdId}/files/${fileId}`, { responseType: 'blob' });
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export default function AdminFilesScreen() {
  const isAdmin = useRequireAdmin();
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AdminFile[]>('/admin/files');
      setFiles(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load files.'));
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      await load();
    })();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Admin</Text>
        <Text>You don&apos;t have access to this page.</Text>
      </ScreenContainer>
    );
  }

  const remove = async (file: AdminFile) => {
    setError(null);
    setBusyId(file.id);
    try {
      await api.delete(`/households/${file.householdId}/files/${file.id}`);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete file.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Files</Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={TABLE_WIDTH}>
        <HeaderRow>
          <HeaderCell width={COLS.filename}>Filename</HeaderCell>
          <HeaderCell width={COLS.household}>House</HeaderCell>
          <HeaderCell width={COLS.size}>Size</HeaderCell>
          <HeaderCell width={COLS.uploadedBy}>Uploaded by</HeaderCell>
          <HeaderCell width={COLS.uploadedAt}>Uploaded</HeaderCell>
          <HeaderCell width={COLS.actions} />
        </HeaderRow>

        {files.map((f, index) => (
          <Row key={f.id} index={index}>
            <Cell width={COLS.filename}>
              <Text numberOfLines={1}>{f.filename}</Text>
            </Cell>
            <Cell width={COLS.household}>
              <Link href={`/admin/houses/${f.householdId}`} style={{ color: '#2563eb' }} numberOfLines={1}>
                {f.householdName}
              </Link>
            </Cell>
            <Cell width={COLS.size}>
              <Text>{formatBytes(f.sizeBytes)}</Text>
            </Cell>
            <Cell width={COLS.uploadedBy}>
              <Text numberOfLines={1} style={{ color: '#666' }}>{f.uploadedByName ?? '-'}</Text>
            </Cell>
            <Cell width={COLS.uploadedAt}>
              <Text style={{ color: '#666' }}>{new Date(f.uploadedAt).toLocaleString()}</Text>
            </Cell>
            <Cell width={COLS.actions}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AdminActionButton label="Download" variant="link" onPress={() => downloadFile(f.householdId, f.id, f.filename)} small />
                <AdminActionButton label="Delete" variant="danger" onPress={() => remove(f)} disabled={busyId === f.id} small />
              </View>
            </Cell>
          </Row>
        ))}
      </TableContainer>
    </ScrollView>
  );
}
