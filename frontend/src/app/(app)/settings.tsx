import * as DocumentPicker from 'expo-document-picker';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { saveButtonStyle } from '@/components/AdminTable';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthedImage } from '@/lib/useAuthedImage';

const ACCOUNT_COLOR = '#64748b';
const PROFILE_PICTURE_URL = '/auth/profile-picture';

function ProfilePicture({ hasProfilePicture, version, busy }: { hasProfilePicture: boolean; version: number; busy: boolean }) {
  const imageUrl = useAuthedImage(hasProfilePicture ? `${PROFILE_PICTURE_URL}?v=${version}` : null);

  if (busy) {
    return (
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (hasProfilePicture && imageUrl) {
    return <Image source={{ uri: imageUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />;
  }

  return (
    <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, color: '#9ca3af' }}>?</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout, changePassword, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);

  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [pictureVersion, setPictureVersion] = useState(0);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ version: string }>('/version')
      .then(({ data }) => setVersion(data.version))
      .catch(() => setVersion(null));
  }, []);

  const uploadPicture = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setPictureBusy(true);
    setPictureError(null);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        formData.append('file', blob, asset.name);
      } else {
        formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
      }
      await api.post(PROFILE_PICTURE_URL, formData);
      await refreshUser();
      setPictureVersion((v) => v + 1);
    } catch (err) {
      setPictureError(getErrorMessage(err, t('app.account.uploadFailed')));
    } finally {
      setPictureBusy(false);
    }
  };

  const removePicture = async () => {
    setPictureBusy(true);
    setPictureError(null);
    try {
      await api.delete(PROFILE_PICTURE_URL);
      await refreshUser();
    } catch (err) {
      setPictureError(getErrorMessage(err, t('app.account.removeFailed')));
    } finally {
      setPictureBusy(false);
    }
  };

  const submitPasswordChange = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(t('app.account.passwordsDontMatch'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t('app.account.passwordTooShort'));
      return;
    }

    setPasswordBusy(true);
    try {
      const message = await changePassword(currentPassword, newPassword);
      setPasswordMessage(message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(getErrorMessage(err, t('app.account.changePasswordFailed')));
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <Module title={t('app.account.title')} color={ACCOUNT_COLOR}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <ProfilePicture hasProfilePicture={Boolean(user?.hasProfilePicture)} version={pictureVersion} busy={pictureBusy} />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={uploadPicture} disabled={pictureBusy}>
            <Text style={{ color: '#2563eb' }}>{user?.hasProfilePicture ? t('app.account.changePhoto') : t('app.account.addPhoto')}</Text>
          </Pressable>
          {user?.hasProfilePicture ? (
            <Pressable onPress={removePicture} disabled={pictureBusy}>
              <Text style={{ color: '#c62828' }}>{t('common.remove')}</Text>
            </Pressable>
          ) : null}
        </View>
        {pictureError ? <Text style={{ color: '#c62828' }}>{pictureError}</Text> : null}
      </View>

      <Text>{t('app.account.signedInAs', { email: user?.email ?? '' })}</Text>
      <Text style={{ color: '#666' }}>{t('app.account.role', { role: user ? t(`app.account.roles.${user.role}`) : '' })}</Text>

      {user?.role === 'ADMIN' ? (
        <Link href="/(app)/admin" style={{ color: '#2563eb' }}>
          {t('app.account.admin')}
        </Link>
      ) : null}

      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 }}>
        <Text style={{ fontWeight: '600' }}>{t('app.account.changePassword')}</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t('app.account.currentPasswordPlaceholder')}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8 }}
        />
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('app.account.newPasswordPlaceholder')}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8 }}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('app.account.confirmPasswordPlaceholder')}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8 }}
        />
        {passwordError ? <Text style={{ color: '#c62828' }}>{passwordError}</Text> : null}
        {passwordMessage ? <Text style={{ color: '#2e7d32' }}>{passwordMessage}</Text> : null}
        <Pressable
          onPress={submitPasswordChange}
          disabled={passwordBusy || !currentPassword || !newPassword || !confirmPassword}
          style={[saveButtonStyle, { alignSelf: 'flex-start', paddingHorizontal: 16 }]}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>{passwordBusy ? t('common.saving') : t('app.account.updatePassword')}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={logout}
        style={{ backgroundColor: '#dc2626', borderRadius: 8, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>{t('app.account.logout')}</Text>
      </Pressable>

      {version ? (
        <Text style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>{t('app.account.version', { version })}</Text>
      ) : null}
    </Module>
  );
}
