import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthedImage } from '@/lib/useAuthedImage';
import type { HouseFile } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function isImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}

function FileThumbnail({ householdId, file }: { householdId: string; file: HouseFile }) {
  const url = isImage(file.contentType) ? `/households/${householdId}/files/${file.id}` : null;
  const imageUrl = useAuthedImage(url);

  if (!isImage(file.contentType)) {
    return (
      <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 10, color: '#999' }}>FILE</Text>
      </View>
    );
  }

  return imageUrl ? (
    <Image source={{ uri: imageUrl }} style={{ width: 36, height: 36, borderRadius: 6 }} />
  ) : (
    <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f3f4f6' }} />
  );
}

export default function FilesScreen() {
  const { user } = useAuth();
  const householdId = user?.households[0]?.householdId;
  const [files, setFiles] = useState<HouseFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    try {
      const { data } = await api.get<HouseFile[]>(`/households/${householdId}/files`);
      setFiles(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load files.'));
    }
  }, [householdId]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  if (!householdId) {
    return (
      <BigCardShell title="Files">
        <Text>You&apos;re not part of a house yet.</Text>
      </BigCardShell>
    );
  }

  const upload = async () => {
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
      await api.post(`/households/${householdId}/files`, formData);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload file.'));
    } finally {
      setBusy(false);
    }
  };

  const download = async (fileId: string, filename: string) => {
    const { data } = await api.get(`/households/${householdId}/files/${fileId}`, { responseType: 'blob' });
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const remove = async (fileId: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/households/${householdId}/files/${fileId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete file.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BigCardShell title="Files">
      <Text style={{ color: '#666' }}>
        Shared files and images for your house. Uploaded images (JPEG, PNG, GIF, WebP, …)
        automatically show up in the screensaver slideshow.
      </Text>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={560}>
        <HeaderRow>
          <HeaderCell width={50} />
          <HeaderCell width={220}>Filename</HeaderCell>
          <HeaderCell width={80}>Size</HeaderCell>
          <HeaderCell width={120}>Uploaded by</HeaderCell>
          <HeaderCell width={120}>-</HeaderCell>
        </HeaderRow>
        {files.map((f, index) => (
          <Row key={f.id} index={index}>
            <Cell width={50}><FileThumbnail householdId={householdId} file={f} /></Cell>
            <Cell width={220}><Text numberOfLines={1}>{f.filename}</Text></Cell>
            <Cell width={80}><Text>{formatBytes(f.sizeBytes)}</Text></Cell>
            <Cell width={120}><Text numberOfLines={1}>{f.uploadedByName ?? '-'}</Text></Cell>
            <Cell width={120}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => download(f.id, f.filename)}>
                  <Text style={{ color: '#2563eb' }}>Download</Text>
                </Pressable>
                <Pressable onPress={() => remove(f.id)} disabled={busy}>
                  <Text style={{ color: '#c62828' }}>Delete</Text>
                </Pressable>
              </View>
            </Cell>
          </Row>
        ))}
      </TableContainer>

      <Pressable onPress={upload} disabled={busy} style={[saveButtonStyle, { alignSelf: 'flex-start', paddingHorizontal: 16 }]}>
        <Text style={{ color: 'white', fontWeight: '600' }}>Upload file</Text>
      </Pressable>
    </BigCardShell>
  );
}
