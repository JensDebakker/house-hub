import { Switch, Text, View } from 'react-native';
import { usePushNotifications } from '@/lib/pushNotifications';

/** The "Push notifications" master toggle plus its two sub-toggles, indented to read as a
 * list with sub-items - toggling the master off visually greys out (and disables) the two
 * underneath it, since they're meaningless while the subscription itself doesn't exist.
 * Only ever rendered while signed in (subscribing hits an authenticated endpoint). */
export const PushNotificationSettings = () => {
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
        Push notifications aren&apos;t supported in this browser.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#475569', fontWeight: '600' }}>Push notifications</Text>
        <Switch value={enabled} disabled={busy} onValueChange={(value) => (value ? enablePush() : disablePush())} />
      </View>
      {permissionDenied ? (
        <Text style={{ color: '#b91c1c', fontSize: 13 }}>
          Notifications are blocked for this site - check your browser&apos;s site settings.
        </Text>
      ) : null}
      {error ? <Text style={{ color: '#b91c1c', fontSize: 13 }}>{error}</Text> : null}

      <View style={{ marginLeft: 20, gap: 10, opacity: enabled ? 1 : 0.4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#475569' }}>New app version released</Text>
          <Switch value={notifyOnVersion} disabled={!enabled || busy} onValueChange={setNotifyOnVersion} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#475569' }}>Message from a housemate</Text>
          <Switch value={notifyOnChatMessage} disabled={!enabled || busy} onValueChange={setNotifyOnChatMessage} />
        </View>
      </View>
    </View>
  );
};
