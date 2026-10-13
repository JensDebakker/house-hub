import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { Module } from '@/components/Module';
import { isRunningStandalone, useInstallPrompt } from '@/lib/installPrompt';

const APP_COLOR = '#0ea5e9';

export default function AppScreen() {
  const { available, promptInstall } = useInstallPrompt();
  const [justInstalled, setJustInstalled] = useState(false);

  if (Platform.OS !== 'web') {
    return (
      <Module title="App" color={APP_COLOR}>
        <Text style={{ color: '#475569' }}>You&apos;re using the House Hub app.</Text>
      </Module>
    );
  }

  const alreadyInstalled = justInstalled || isRunningStandalone();

  const onInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') setJustInstalled(true);
  };

  return (
    <Module title="App" color={APP_COLOR}>
      <Text style={{ color: '#475569' }}>
        {alreadyInstalled
          ? 'House Hub is installed on this device.'
          : available
            ? 'Install House Hub for quicker access from your home screen.'
            : 'This browser doesn&apos;t support one-tap install here - use its &quot;Add to Home Screen&quot; option instead.'}
      </Text>
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
