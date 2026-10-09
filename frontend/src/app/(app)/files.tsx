import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Cell, HeaderCell, HeaderRow, Row, TableContainer, saveButtonStyle } from '@/components/AdminTable';
import { BigCardShell } from '@/components/BigCardShell';
import { useAuth } from '@/contexts/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthedImage } from '@/lib/useAuthedImage';
import type { FolderContents, HouseFile, HouseFolder } from '@/types';

type Breadcrumb = { id: string | null; name: string };

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
  const isOwner = user?.households[0]?.role === 'OWNER';

  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Files' }]);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id ?? null;

  const [folders, setFolders] = useState<HouseFolder[]>([]);
  const [files, setFiles] = useState<HouseFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const load = useCallback(
    async (folderId: string | null) => {
      if (!householdId) return;
      try {
        const { data } = await api.get<FolderContents>(`/households/${householdId}/folders/contents`, {
          params: folderId ? { parentId: folderId } : undefined,
        });
        setFolders(data.folders);
        setFiles(data.files);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load files.'));
      }
    },
    [householdId],
  );

  useEffect(() => {
    (async () => {
      await load(currentFolderId);
    })();
  }, [load, currentFolderId]);

  if (!householdId) {
    return (
      <BigCardShell title="Files">
        <Text>You&apos;re not part of a house yet.</Text>
      </BigCardShell>
    );
  }

  const openFolder = (folder: HouseFolder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const goToCrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const createFolder = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/households/${householdId}/folders`, { name: trimmed, parentFolderId: currentFolderId });
      setNewFolderName('');
      setShowNewFolder(false);
      await load(currentFolderId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create folder.'));
    } finally {
      setBusy(false);
    }
  };

  const promptNewFolder = () => {
    if (Platform.OS === 'web') {
      const name = window.prompt('Folder name');
      if (name) {
        void createFolder(name);
      }
    } else {
      setShowNewFolder(true);
    }
  };

  const deleteFolder = async (folder: HouseFolder) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete folder "${folder.name}" and everything inside it?`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/households/${householdId}/folders/${folder.id}`);
      await load(currentFolderId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete folder.'));
    } finally {
      setBusy(false);
    }
  };

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
      const url = currentFolderId
        ? `/households/${householdId}/files?folderId=${currentFolderId}`
        : `/households/${householdId}/files`;
      await api.post(url, formData);
      await load(currentFolderId);
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

  const remove = async (fileId: string, filename: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete "${filename}"?`);
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/households/${householdId}/files/${fileId}`);
      await load(currentFolderId);
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
        automatically show up in the screensaver slideshow, no matter which folder they&apos;re in.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        {breadcrumbs.map((crumb, index) => (
          <View key={crumb.id ?? 'root'} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {index > 0 ? <Text style={{ color: '#999' }}>/</Text> : null}
            <Pressable onPress={() => goToCrumb(index)} disabled={index === breadcrumbs.length - 1}>
              <Text
                style={{
                  color: index === breadcrumbs.length - 1 ? '#111' : '#2563eb',
                  fontWeight: index === breadcrumbs.length - 1 ? '600' : '400',
                }}
              >
                {crumb.name}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <TableContainer width={560}>
        <HeaderRow>
          <HeaderCell width={50} />
          <HeaderCell width={220}>Name</HeaderCell>
          <HeaderCell width={80}>Size</HeaderCell>
          <HeaderCell width={120}>By</HeaderCell>
          <HeaderCell width={120}>-</HeaderCell>
        </HeaderRow>
        {folders.map((folder, index) => {
          const canDelete = isOwner || folder.createdById === user?.id;
          return (
            <Row key={folder.id} index={index}>
              <Cell width={50}>
                <Text style={{ fontSize: 20 }}>📁</Text>
              </Cell>
              <Cell width={220}>
                <Pressable onPress={() => openFolder(folder)}>
                  <Text numberOfLines={1} style={{ color: '#2563eb' }}>
                    {folder.name}
                  </Text>
                </Pressable>
              </Cell>
              <Cell width={80}>
                <Text>-</Text>
              </Cell>
              <Cell width={120}>
                <Text numberOfLines={1}>{folder.createdByName ?? '-'}</Text>
              </Cell>
              <Cell width={120}>
                {canDelete ? (
                  <Pressable onPress={() => deleteFolder(folder)} disabled={busy}>
                    <Text style={{ color: '#c62828' }}>Delete</Text>
                  </Pressable>
                ) : null}
              </Cell>
            </Row>
          );
        })}
        {files.map((f, index) => {
          const canDelete = isOwner || f.uploadedById === user?.id;
          return (
            <Row key={f.id} index={folders.length + index}>
              <Cell width={50}>
                <FileThumbnail householdId={householdId} file={f} />
              </Cell>
              <Cell width={220}>
                <Text numberOfLines={1}>{f.filename}</Text>
              </Cell>
              <Cell width={80}>
                <Text>{formatBytes(f.sizeBytes)}</Text>
              </Cell>
              <Cell width={120}>
                <Text numberOfLines={1}>{f.uploadedByName ?? '-'}</Text>
              </Cell>
              <Cell width={120}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => download(f.id, f.filename)}>
                    <Text style={{ color: '#2563eb' }}>Download</Text>
                  </Pressable>
                  {canDelete ? (
                    <Pressable onPress={() => remove(f.id, f.filename)} disabled={busy}>
                      <Text style={{ color: '#c62828' }}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Cell>
            </Row>
          );
        })}
      </TableContainer>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Pressable onPress={upload} disabled={busy} style={[saveButtonStyle, { alignSelf: 'flex-start', paddingHorizontal: 16 }]}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Upload file</Text>
        </Pressable>
        <Pressable
          onPress={promptNewFolder}
          disabled={busy}
          style={[saveButtonStyle, { alignSelf: 'flex-start', paddingHorizontal: 16, backgroundColor: '#555' }]}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>New folder</Text>
        </Pressable>
      </View>

      {showNewFolder ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={newFolderName}
            onChangeText={setNewFolderName}
            placeholder="Folder name"
            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, width: 200 }}
            autoFocus
          />
          <Pressable
            onPress={() => createFolder(newFolderName)}
            disabled={busy || !newFolderName.trim()}
            style={[saveButtonStyle, { paddingHorizontal: 16 }]}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Create</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setShowNewFolder(false);
              setNewFolderName('');
            }}
          >
            <Text style={{ color: '#666' }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </BigCardShell>
  );
}
