import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Module } from '@/components/Module';

const TILE_WRAPPER = { flexBasis: '31%' } as const;

export default function ScreensaverIndexScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const basePath = `/screensaver/${householdId}`;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      <View style={TILE_WRAPPER}>
        <Module tile title="Start" subtitle="Launch kiosk display" href={`${basePath}/start`} color="#7c3aed" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="Layout" subtitle="Overlay elements & position" href={`${basePath}/layout`} color="#9333ea" />
      </View>
      <View style={TILE_WRAPPER}>
        <Module tile title="AutoStart" subtitle="Idle auto-launch" href={`${basePath}/autostart`} color="#a855f7" />
      </View>
    </View>
  );
}
