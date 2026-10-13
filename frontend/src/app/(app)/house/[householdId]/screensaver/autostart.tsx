import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Module } from '@/components/Module';
import {
  loadScreensaverAutoStartPrefs,
  saveScreensaverAutoStartPrefs,
  type ScreensaverAutoStartPrefs,
} from '@/lib/storage';

const AUTOSTART_COLOR = '#a855f7';
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;

function clampMinutes(value: number): number {
  if (Number.isNaN(value)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

/** Same styled Pressable toggle used by the Layout submodule - no `Switch` from
 * react-native is used anywhere else in this codebase. */
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: value ? AUTOSTART_COLOR : '#d1d5db',
        padding: 2,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: 'white',
          alignSelf: value ? 'flex-end' : 'flex-start',
        }}
      />
    </Pressable>
  );
}

export default function ScreensaverAutoStartScreen() {
  const [prefs, setPrefs] = useState<ScreensaverAutoStartPrefs | null>(null);
  const [minutesText, setMinutesText] = useState('');

  useEffect(() => {
    loadScreensaverAutoStartPrefs().then((loaded) => {
      setPrefs(loaded);
      setMinutesText(String(loaded.idleTimeoutMinutes));
    });
  }, []);

  const save = (next: ScreensaverAutoStartPrefs) => {
    setPrefs(next);
    saveScreensaverAutoStartPrefs(next);
  };

  const commitMinutes = (text: string) => {
    if (!prefs) return;
    const parsed = clampMinutes(Number(text));
    setMinutesText(String(parsed));
    save({ ...prefs, idleTimeoutMinutes: parsed });
  };

  if (!prefs) {
    return <Module title="AutoStart" color={AUTOSTART_COLOR} />;
  }

  return (
    <Module title="AutoStart" color={AUTOSTART_COLOR}>
      <View
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Auto-start when idle</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Launch the screensaver automatically after a period of inactivity.
            </Text>
          </View>
          <Toggle value={prefs.enabled} onToggle={() => save({ ...prefs, enabled: !prefs.enabled })} />
        </View>

        <View style={{ opacity: prefs.enabled ? 1 : 0.4, gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600' }}>Idle timeout (minutes)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              disabled={!prefs.enabled}
              onPress={() => commitMinutes(String(clampMinutes(prefs.idleTimeoutMinutes - 1)))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700' }}>−</Text>
            </Pressable>
            <TextInput
              editable={prefs.enabled}
              value={minutesText}
              onChangeText={setMinutesText}
              onEndEditing={() => commitMinutes(minutesText)}
              onBlur={() => commitMinutes(minutesText)}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 8,
                width: 60,
                textAlign: 'center',
              }}
            />
            <Pressable
              disabled={!prefs.enabled}
              onPress={() => commitMinutes(String(clampMinutes(prefs.idleTimeoutMinutes + 1)))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700' }}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Module>
  );
}
