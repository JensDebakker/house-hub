import { useState } from 'react';
import { Platform, Pressable, Switch, Text, View } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { isIOS, isIOSSafari, isRunningStandalone, useInstallPrompt } from '@/lib/installPrompt';
import { usePushNotifications } from '@/lib/pushNotifications';

const APP_COLOR = '#0ea5e9';

/** The "Push notifications" master toggle plus its two sub-toggles, indented to read as a
 * list with sub-items - toggling the master off visually greys out (and disables) the two
 * underneath it, since they're meaningless while the subscription itself doesn't exist.
 * Only ever rendered while signed in (subscribing hits an authenticated endpoint). */
function PushNotificationSettings() {
  const { supported, enabled, busy, permissionDenied, error, notifyOnVersion, notifyOnChatMessage, enablePush, disablePush, setNotifyOnVersion, setNotifyOnChatMessage } = usePushNotifications();

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
}

/** The "App" module's card content - PWA install prompt/status. Shared by the authenticated
 * (app)/app.tsx route and the pre-login (auth)/app.tsx copy, so a visitor can install House
 * Hub before ever signing in, not just from inside the authenticated dashboard. */
export function AppModuleCard() {
  const { isAuthenticated } = useAuth();
  const { available, promptInstall } = useInstallPrompt();
  // Distinguishes "the prompt is gone because the user already acted on it" from "the
  // prompt was never available in the first place" - both leave `available` false, but
  // they need different messages (a dismissed prompt doesn't mean the browser can't
  // install the app, just that this page load's one-shot chance was already used).
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  if (Platform.OS !== 'web') {
    return (
      <Module title="App" color={APP_COLOR}>
        <Text style={{ color: '#475569' }}>You&apos;re using the House Hub app.</Text>
      </Module>
    );
  }

  const alreadyInstalled = outcome === 'accepted' || isRunningStandalone();

  const onInstall = async () => {
    const result = await promptInstall();
    if (result) setOutcome(result);
  };

  const message = alreadyInstalled
    ? 'House Hub is installed on this device.'
    : available
      ? 'Install House Hub for quicker access from your home screen.'
      : outcome === 'dismissed'
        ? "You can install House Hub later from this browser's menu."
        : isIOSSafari()
          ? 'Tap the Share icon in Safari, then "Add to Home Screen".'
          : isIOS()
            ? "Open this page in Safari to install it - other browsers on iPhone/iPad can't add it to your home screen."
            : 'This browser doesn\'t support one-tap install here - look for "Add to Home Screen" or "Install app" in its menu.';

  return (
    <Module title="App" color={APP_COLOR}>
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
          <Text style={{ color: 'white', fontWeight: '700' }}>Install app</Text>
        </Pressable>
      ) : null}
      {isAuthenticated ? <PushNotificationSettings /> : null}
    </Module>
  );
}
