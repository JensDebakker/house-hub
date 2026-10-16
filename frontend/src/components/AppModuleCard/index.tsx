import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { isIOS, isIOSSafari, isRunningStandalone, useInstallPrompt } from '@/lib/installPrompt';
import { PushNotificationSettings } from './PushNotificationSettings';

const APP_COLOR = '#0ea5e9';

/** The "App" module's card content - PWA install prompt/status. Shared by the authenticated
 * (app)/app.tsx route and the pre-login (auth)/app.tsx copy, so a visitor can install House
 * Hub before ever signing in, not just from inside the authenticated dashboard. */
export const AppModuleCard = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { available, promptInstall } = useInstallPrompt();
  // Distinguishes "the prompt is gone because the user already acted on it" from "the
  // prompt was never available in the first place" - both leave `available` false, but
  // they need different messages (a dismissed prompt doesn't mean the browser can't
  // install the app, just that this page load's one-shot chance was already used).
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  if (Platform.OS !== 'web') {
    return (
      <Module title={t('app.installApp.title')} color={APP_COLOR}>
        <Text style={{ color: '#475569' }}>{t('app.installApp.nativeApp')}</Text>
      </Module>
    );
  }

  const alreadyInstalled = outcome === 'accepted' || isRunningStandalone();

  const onInstall = async () => {
    const result = await promptInstall();
    if (result) setOutcome(result);
  };

  const message = alreadyInstalled
    ? t('app.installApp.installed')
    : available
      ? t('app.installApp.available')
      : outcome === 'dismissed'
        ? t('app.installApp.dismissed')
        : isIOSSafari()
          ? t('app.installApp.iosSafari')
          : isIOS()
            ? t('app.installApp.iosOther')
            : t('app.installApp.unsupported');

  return (
    <Module title={t('app.installApp.title')} color={APP_COLOR}>
      <Text style={{ color: '#475569' }}>{message}</Text>
      {!alreadyInstalled && available ? (
        <Pressable
          onPress={onInstall}
          style={{
            backgroundColor: APP_COLOR,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>{t('app.installApp.install')}</Text>
        </Pressable>
      ) : null}
      {isAuthenticated ? <PushNotificationSettings /> : null}
    </Module>
  );
};
