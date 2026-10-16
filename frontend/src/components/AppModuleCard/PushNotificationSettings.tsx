import { Switch, Text, View } from 'react-native';
import { useTranslation } from '@/i18n';
import { usePushNotifications } from '@/lib/pushNotifications';

/** The "Push notifications" master toggle plus its two sub-toggles, indented to read as a
 * list with sub-items - toggling the master off visually greys out (and disables) the two
 * underneath it, since they're meaningless while the subscription itself doesn't exist.
 * Only ever rendered while signed in (subscribing hits an authenticated endpoint). */
export const PushNotificationSettings = () => {
  const { t } = useTranslation();
  const {
    supported,
    enabled,
    busy,
    permissionDenied,
    error,
    notifyOnVersion,
    notifyOnChatMessage,
    enablePush,
    disablePush,
    setNotifyOnVersion,
    setNotifyOnChatMessage,
  } = usePushNotifications();

  if (!supported) {
    return (
      <Text style={{ color: '#64748b', fontSize: 13 }}>
        {t('app.push.unsupported')}
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#475569', fontWeight: '600' }}>{t('app.push.title')}</Text>
        <Switch value={enabled} disabled={busy} onValueChange={(value) => (value ? enablePush() : disablePush())} />
      </View>
      {permissionDenied ? (
        <Text style={{ color: '#b91c1c', fontSize: 13 }}>
          {t('app.push.blocked')}
        </Text>
      ) : null}
      {error ? <Text style={{ color: '#b91c1c', fontSize: 13 }}>{error}</Text> : null}

      <View style={{ marginLeft: 20, gap: 10, opacity: enabled ? 1 : 0.4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#475569' }}>{t('app.push.newVersion')}</Text>
          <Switch value={notifyOnVersion} disabled={!enabled || busy} onValueChange={setNotifyOnVersion} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#475569' }}>{t('app.push.chatMessage')}</Text>
          <Switch value={notifyOnChatMessage} disabled={!enabled || busy} onValueChange={setNotifyOnChatMessage} />
        </View>
      </View>
    </View>
  );
};
