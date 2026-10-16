import { Pressable, Text, View } from 'react-native';
import { Module } from '@/components/Module';
import { LANGUAGES, useTranslation } from '@/i18n';

export const LANGUAGE_COLOR = '#14b8a6';

/** The "Language" module's card content - a list of the supported languages, tapping one
 * switches the whole UI over immediately (every screen reads through useTranslation, so the
 * context change re-renders them in place). Shared by the authenticated (app)/language.tsx
 * route and the pre-login (auth)/language.tsx copy, same split as AppModuleCard. */
export const LanguageModuleCard = () => {
  const { t, language, setLanguage } = useTranslation();

  return (
    <Module title={t('language.title')} color={LANGUAGE_COLOR}>
      <Text style={{ color: '#475569' }}>{t('language.description')}</Text>
      <View style={{ gap: 8 }}>
        {LANGUAGES.map((l) => {
          const selected = l.code === language;
          return (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 8,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? LANGUAGE_COLOR : '#e5e7eb',
                backgroundColor: selected ? '#f0fdfa' : 'white',
              }}
            >
              <Text style={{ fontSize: 22 }}>{l.flag}</Text>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: selected ? '700' : '400', color: '#0f172a' }}>
                {l.nativeName}
              </Text>
              {selected ? <Text style={{ color: LANGUAGE_COLOR, fontSize: 18, fontWeight: '700' }}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Module>
  );
};
