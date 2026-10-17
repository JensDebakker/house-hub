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
