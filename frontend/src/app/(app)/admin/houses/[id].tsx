import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type {
  AdminUser,
  HouseholdDetail,
  HouseholdRole,
} from '@/types';

const HOUSEHOLD_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER'];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function AdminHouseDetailScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limitGb, setLimitGb] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<HouseholdRole>('MEMBER');
  const [busy, setBusy] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    try {
      const [detailRes, usersRes] = await Promise.all([
        api.get<HouseholdDetail>(`/admin/households/${id}`),
        api.get<AdminUser[]>('/admin/users'),
      ]);
      setDetail(detailRes.data);
      setAllUsers(usersRes.data);
      setLimitGb((detailRes.data.household.storageLimitBytes / 1024 ** 3).toString());
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load house.'));
    }
  }, [id]);

  useEffect(() => {
    if (!isAdmin || !id) return;
    (async () => {
      await load();
    })();
  }, [isAdmin, id, load]);

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <Text>You don&apos;t have access to this page.</Text>
      </ScreenContainer>
    );
  }

  if (!detail) {
    return (
      <ScreenContainer>
        {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : <Text>Loading…</Text>}
      </ScreenContainer>
    );
  }

  const { household, members, tasks, supplies, shoppingLists, calendarEvents, files } = detail;

  const saveLimit = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = Math.round(parseFloat(limitGb || '0') * 1024 ** 3);
      await api.patch(`/admin/households/${id}`, { storageLimitBytes: bytes });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update storage limit.'));
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!newMemberId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/households/${id}/members`, { userId: newMemberId, role: newMemberRole });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add member.'));
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/admin/households/${id}/members/${userId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove member.'));
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        formData.append('file', blob, asset.name);
      } else {
        formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as unknown as Blob);
      }
      await api.post(`/households/${id}/files`, formData);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload file.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/households/${id}/files/${fileId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete file.'));
    } finally {
      setBusy(false);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const addableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>{household.name}</Text>
        <Text style={{ color: '#666' }}>Invite code: {household.inviteCode}</Text>
        <Link href="/admin/houses" style={{ color: '#2563eb' }}>
          ← Back to houses
        </Link>
      </View>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text>Storage limit (GB):</Text>
        <TextInput
          value={limitGb}
          onChangeText={setLimitGb}
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, width: 80 }}
        />
        <Pressable onPress={saveLimit} disabled={busy} style={saveButtonStyle}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>
        </Pressable>
        <Text style={{ color: '#666' }}>
          Used: {formatBytes(household.storageUsedBytes)} / {formatBytes(household.storageLimitBytes)}
        </Text>
      </View>

      <Section title="Members">
        <TableContainer width={430}>
          <HeaderRow>
            <HeaderCell width={180}>Name</HeaderCell>
            <HeaderCell width={110}>Role</HeaderCell>
            <HeaderCell width={140}>-</HeaderCell>
          </HeaderRow>
          {members.map((m, index) => (
            <Row key={m.userId} index={index}>
              <Cell width={180}>
                <Link href={`/admin/users/${m.userId}`} style={{ color: '#2563eb' }}>{m.displayName}</Link>
              </Cell>
              <Cell width={110}><Text>{m.role}</Text></Cell>
              <Cell width={140}>
                <Pressable onPress={() => removeMember(m.userId)} disabled={busy}>
                  <Text style={{ color: '#c62828' }}>Remove</Text>
                </Pressable>
              </Cell>
            </Row>
          ))}
        </TableContainer>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Picker selectedValue={newMemberId} onValueChange={setNewMemberId} style={{ width: 220 }}>
            <Picker.Item label="Select a user…" value="" />
            {addableUsers.map((u) => (
              <Picker.Item key={u.id} label={`${u.displayName} (${u.email})`} value={u.id} />
            ))}
          </Picker>
          <Picker selectedValue={newMemberRole} onValueChange={setNewMemberRole} style={{ width: 130 }}>
            {HOUSEHOLD_ROLES.map((r) => (
              <Picker.Item key={r} label={r} value={r} />
            ))}
          </Picker>
          <Pressable onPress={addMember} disabled={busy || !newMemberId} style={saveButtonStyle}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Add member</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Tasks">
        <TableContainer width={420}>
          <HeaderRow>
            <HeaderCell width={220}>Title</HeaderCell>
            <HeaderCell width={80}>Done</HeaderCell>
            <HeaderCell width={120}>Due</HeaderCell>
          </HeaderRow>
          {tasks.map((t, index) => (
            <Row key={t.id} index={index}>
              <Cell width={220}><Text numberOfLines={1}>{t.title}</Text></Cell>
              <Cell width={80}><Text>{t.done ? 'Yes' : 'No'}</Text></Cell>
              <Cell width={120}><Text>{t.dueDate ?? '-'}</Text></Cell>
            </Row>
          ))}
        </TableContainer>
      </Section>

      <Section title="Supplies">
        <TableContainer width={420}>
          <HeaderRow>
            <HeaderCell width={220}>Name</HeaderCell>
            <HeaderCell width={80}>Qty</HeaderCell>
            <HeaderCell width={120}>Expiry</HeaderCell>
          </HeaderRow>
          {supplies.map((s, index) => (
            <Row key={s.id} index={index}>
              <Cell width={220}><Text numberOfLines={1}>{s.name}</Text></Cell>
              <Cell width={80}><Text>{s.quantity}</Text></Cell>
              <Cell width={120}><Text>{s.expiryDate}</Text></Cell>
            </Row>
          ))}
        </TableContainer>
      </Section>

      <Section title="Shopping lists">
        <TableContainer width={420}>
          <HeaderRow>
            <HeaderCell width={220}>Name</HeaderCell>
            <HeaderCell width={200}>Items</HeaderCell>
          </HeaderRow>
          {shoppingLists.map((s, index) => (
            <Row key={s.id} index={index}>
              <Cell width={220}><Text numberOfLines={1}>{s.name}</Text></Cell>
              <Cell width={200}><Text>{s.items.length} item(s)</Text></Cell>
            </Row>
          ))}
        </TableContainer>
      </Section>

      <Section title="Calendar events">
        <TableContainer width={420}>
          <HeaderRow>
            <HeaderCell width={220}>Title</HeaderCell>
            <HeaderCell width={200}>Start</HeaderCell>
          </HeaderRow>
          {calendarEvents.map((c, index) => (
            <Row key={c.id} index={index}>
              <Cell width={220}><Text numberOfLines={1}>{c.title}</Text></Cell>
              <Cell width={200}><Text>{new Date(c.start).toLocaleString()}</Text></Cell>
            </Row>
          ))}
        </TableContainer>
      </Section>

      <Section title="Files">
        <TableContainer width={520}>
          <HeaderRow>
            <HeaderCell width={200}>Filename</HeaderCell>
            <HeaderCell width={80}>Size</HeaderCell>
            <HeaderCell width={120}>Uploaded by</HeaderCell>
            <HeaderCell width={120}>-</HeaderCell>
          </HeaderRow>
          {files.map((f, index) => (
            <Row key={f.id} index={index}>
              <Cell width={200}><Text numberOfLines={1}>{f.filename}</Text></Cell>
              <Cell width={80}><Text>{formatBytes(f.sizeBytes)}</Text></Cell>
              <Cell width={120}><Text numberOfLines={1}>{f.uploadedByName ?? '-'}</Text></Cell>
              <Cell width={120}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => downloadFile(id, f.id, f.filename)}>
                    <Text style={{ color: '#2563eb' }}>Download</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteFile(f.id)} disabled={busy}>
                    <Text style={{ color: '#c62828' }}>Delete</Text>
                  </Pressable>
                </View>
              </Cell>
            </Row>
          ))}
        </TableContainer>
        <Pressable onPress={uploadFile} disabled={busy} style={[saveButtonStyle, { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 16 }]}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Upload file</Text>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

async function downloadFile(householdId: string | undefined, fileId: string, filename: string) {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text>
      {children}
    </View>
  );
}
