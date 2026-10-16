import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Module } from '@/components/Module';
import { useTranslation, type TranslationKey } from '@/i18n';
import {
  loadScreensaverLayoutPrefs,
  saveScreensaverLayoutPrefs,
  type ScreensaverCorner,
  type ScreensaverElementId,
  type ScreensaverLayoutPrefs,
} from '@/lib/storage';

const LAYOUT_COLOR = '#9333ea';

const ELEMENTS: { id: ScreensaverElementId; label: TranslationKey }[] = [
  { id: 'time', label: 'screensaver.elements.time' },
  { id: 'date', label: 'screensaver.elements.date' },
  { id: 'calendar', label: 'screensaver.elements.calendar' },
  { id: 'chat', label: 'screensaver.elements.chat' },
];

const CORNERS: { id: ScreensaverCorner; label: TranslationKey }[] = [
  { id: 'top-left', label: 'screensaver.corners.topLeft' },
  { id: 'top-right', label: 'screensaver.corners.topRight' },
  { id: 'bottom-left', label: 'screensaver.corners.bottomLeft' },
  { id: 'bottom-right', label: 'screensaver.corners.bottomRight' },
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
  const { t } = useTranslation();
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
            {t(c.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ScreensaverLayoutScreen() {
  const { t } = useTranslation();
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
    return <Module title={t('screensaver.layout.title')} color={LAYOUT_COLOR} />;
  }

  return (
    <Module title={t('screensaver.layout.title')} color={LAYOUT_COLOR}>
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
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{t(label)}</Text>
              <Toggle value={config.enabled} onToggle={() => update(id, { enabled: !config.enabled })} />
            </View>
            <CornerPicker value={config.corner} onChange={(corner) => update(id, { corner })} />
          </View>
        );
      })}
    </Module>
  );
}
