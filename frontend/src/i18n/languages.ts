export type LanguageCode = 'en' | 'nl' | 'fr';

export interface Language {
  code: LanguageCode;
  /** Shown in the language list in the language's own name, so someone who can't read the
   * current UI language can still find theirs. */
  nativeName: string;
  flag: string;
  /** BCP 47 tag handed to Intl / toLocale*String for dates and times. */
  locale: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', nativeName: 'English', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱', locale: 'nl-BE' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-BE' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const isLanguageCode = (value: unknown): value is LanguageCode =>
  LANGUAGES.some((l) => l.code === value);

export const getLanguage = (code: LanguageCode): Language =>
  LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** Best guess at the device/browser language for a first launch with nothing saved yet.
 * Intl is available on web and Hermes alike, so this needs no extra native module. */
export function detectDeviceLanguage(): LanguageCode {
  try {
    const candidates =
      typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
        ? navigator.languages
        : [Intl.DateTimeFormat().resolvedOptions().locale];
    for (const tag of candidates) {
      const base = tag?.toLowerCase().split('-')[0];
      if (isLanguageCode(base)) return base;
    }
  } catch {
    // Fall through to the default.
  }
  return DEFAULT_LANGUAGE;
}
