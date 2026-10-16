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
        {t('app.authLanding.tagline')}
      </Text>

      {hasPendingInvite ? (
        <Text style={{ color: LOGIN_COLOR, fontWeight: '600', paddingHorizontal: 4 }}>
          {t('app.authLanding.pendingInvite')}
        </Text>
      ) : null}

      <TileGrid>
        <Module tile title={t('app.tiles.login.title')} subtitle={t('app.tiles.login.subtitle')} href="/(auth)/login" color={LOGIN_COLOR} />
        <Module tile title={t('app.tiles.register.title')} subtitle={t('app.tiles.register.subtitle')} href="/(auth)/register" color={REGISTER_COLOR} />
        <Module tile title={t('app.tiles.app.title')} subtitle={t('app.tiles.app.subtitle')} href="/app" color={APP_COLOR} />
        <Module tile title={t('language.title')} subtitle={t('language.subtitle')} href="/language" color={LANGUAGE_COLOR} />
      </TileGrid>
    </>
  );
}
