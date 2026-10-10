import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Module } from '@/components/Module';
import {
  loadScreensaverLayoutPrefs,
  saveScreensaverLayoutPrefs,
  type ScreensaverCorner,
  type ScreensaverElementId,
  type ScreensaverLayoutPrefs,
} from '@/lib/storage';

const LAYOUT_COLOR = '#9333ea';

const ELEMENTS: { id: ScreensaverElementId; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'date', label: 'Date' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'chat', label: 'House Chat' },
];

const CORNERS: { id: ScreensaverCorner; label: string }[] = [
  { id: 'top-left', label: 'Top left' },
  { id: 'top-right', label: 'Top right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-right', label: 'Bottom right' },
];

/** Styled Pressable toggle, matching the rest of this app's form controls (no `Switch`
 * from react-native is used anywhere else in the codebase). */
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: value ? LAYOUT_COLOR : '#d1d5db',
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

function CornerPicker({
  value,
  onChange,
}: {
  value: ScreensaverCorner;
  onChange: (corner: ScreensaverCorner) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {CORNERS.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onChange(c.id)}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: value === c.id ? LAYOUT_COLOR : '#d1d5db',
            backgroundColor: value === c.id ? '#f3e8ff' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 12, color: value === c.id ? LAYOUT_COLOR : '#6b7280', fontWeight: value === c.id ? '700' : '400' }}>
            {c.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ScreensaverLayoutScreen() {
  const [prefs, setPrefs] = useState<ScreensaverLayoutPrefs | null>(null);

  useEffect(() => {
    loadScreensaverLayoutPrefs().then(setPrefs);
  }, []);

  const update = (id: ScreensaverElementId, patch: Partial<{ enabled: boolean; corner: ScreensaverCorner }>) => {
    if (!prefs) return;
    const next: ScreensaverLayoutPrefs = {
      elements: {
        ...prefs.elements,
        [id]: { ...prefs.elements[id], ...patch },
      },
    };
    setPrefs(next);
    saveScreensaverLayoutPrefs(next);
  };

  if (!prefs) {
    return <Module title="Layout" color={LAYOUT_COLOR} />;
  }

  return (
    <Module title="Layout" color={LAYOUT_COLOR}>
      {ELEMENTS.map(({ id, label }) => {
        const config = prefs.elements[id];
        return (
          <View
            key={id}
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{label}</Text>
              <Toggle value={config.enabled} onToggle={() => update(id, { enabled: !config.enabled })} />
            </View>
            <CornerPicker value={config.corner} onChange={(corner) => update(id, { corner })} />
          </View>
        );
      })}
    </Module>
  );
}
