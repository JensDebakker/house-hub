import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Module } from '@/components/Module';
import { LANGUAGE_COLOR } from '@/components/LanguageModuleCard';
import { TileGrid } from '@/components/TileGrid';
import { useTranslation } from '@/i18n';
import { loadPendingInviteCode } from '@/lib/storage';

const LOGIN_COLOR = '#2563eb';
const REGISTER_COLOR = '#16a34a';
const APP_COLOR = '#0ea5e9';

// Level 0 of this (auth) stack's own card hierarchy (see _layout.tsx) - one tile per
// pre-login module, same shape as the Houses overview's tile grid.
export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  useEffect(() => {
    loadPendingInviteCode().then((code) => setHasPendingInvite(code !== null));
  }, []);

  return (
    <>
      <Text style={{ color: '#666', paddingHorizontal: 4 }}>
        Manage your house — tasks, shopping, supplies, and more.
      </Text>

      {hasPendingInvite ? (
        <Text style={{ color: LOGIN_COLOR, fontWeight: '600', paddingHorizontal: 4 }}>
          Sign in or register to join the house you were invited to.
        </Text>
      ) : null}

      <TileGrid>
        <Module tile title="Log in" subtitle="Already have an account?" href="/(auth)/login" color={LOGIN_COLOR} />
        <Module tile title="Register" subtitle="New here? Create one" href="/(auth)/register" color={REGISTER_COLOR} />
        <Module tile title="App" subtitle="Install & app info" href="/app" color={APP_COLOR} />
        <Module tile title={t('language.title')} subtitle={t('language.subtitle')} href="/language" color={LANGUAGE_COLOR} />
      </TileGrid>
    </>
  );
}
