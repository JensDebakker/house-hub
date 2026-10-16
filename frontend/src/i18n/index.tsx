import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadLanguage, saveLanguage } from '@/lib/storage';
import { DEFAULT_LANGUAGE, detectDeviceLanguage, getLanguage, type LanguageCode } from './languages';
import { translations, type Plural, type Translations } from './locales';

export { LANGUAGES, type Language, type LanguageCode } from './languages';

type Leaf = string | Plural;

/** Every dot-separated key that ends on a translatable string (or plural pair) - so
 * `t('house.tasks.title')` is checked at compile time and a typo is a tsc error, not a
 * blank label at runtime. */
export type TranslationKey<T = Translations> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${TranslationKey<T[K]>}`;
}[keyof T & string];

/** `{{name}}`-style placeholders. `count` additionally picks between a key's `one`/`other`
 * forms when the key is a plural pair. */
export type TranslationParams = Record<string, string | number>;

// Module-level mirror of the active language, so plain (non-component) code - query hooks'
// error fallbacks, helpers like formatMemberCount - can translate without a hook. Kept in
// sync by LanguageProvider; components should still prefer useTranslation() so they
// re-render when it changes.
let currentLanguage: LanguageCode = DEFAULT_LANGUAGE;

function lookup(language: LanguageCode, key: string): Leaf | undefined {
  let node: unknown = translations[language];
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || (node != null && typeof node === 'object' && 'other' in node)
    ? (node as Leaf)
    : undefined;
}

export function translate(key: TranslationKey, params?: TranslationParams, language: LanguageCode = currentLanguage): string {
  // Falls back to English, then to the raw key, so a missing translation degrades to
  // readable text rather than an empty label.
  const leaf = lookup(language, key) ?? lookup(DEFAULT_LANGUAGE, key) ?? key;
  const template = typeof leaf === 'string' ? leaf : params?.count === 1 ? leaf.one : leaf.other;
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

/** BCP 47 locale for the active language, for toLocale*String / Intl in non-component code. */
export const currentLocale = (): string => getLanguage(currentLanguage).locale;

interface LanguageContextValue {
  language: LanguageCode;
  /** BCP 47 tag for dates/times, e.g. `date.toLocaleDateString(locale, ...)`. */
  locale: string;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    currentLanguage = detectDeviceLanguage();
    return currentLanguage;
  });

  useEffect(() => {
    loadLanguage().then((saved) => {
      if (saved) {
        currentLanguage = saved;
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    currentLanguage = next;
    setLanguageState(next);
    saveLanguage(next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: getLanguage(language).locale,
      setLanguage,
      t: (key, params) => translate(key, params, language),
    }),
    [language, setLanguage],
  );

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used inside LanguageProvider');
  return ctx;
}
