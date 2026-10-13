import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { Module } from '@/components/Module';
import { isRunningStandalone, useInstallPrompt } from '@/lib/installPrompt';

const APP_COLOR = '#0ea5e9';

export default function AppScreen() {
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
        : 'This browser doesn\'t support one-tap install here - use its "Add to Home Screen" option instead.';

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
    </Module>
  );
}
