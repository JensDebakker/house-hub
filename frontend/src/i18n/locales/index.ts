import type { LanguageCode } from '../languages';
import { en } from './en';
import { fr } from './fr';
import { nl } from './nl';

/** A count-dependent string: `t(key, { count })` picks `one` when count is 1, else `other`. */
export interface Plural {
  one: string;
  other: string;
}

/** English is the source of truth for the shape: every other language's namespace files
 * are typed against the English ones, so a missing or misspelled key fails tsc. */
export type Translations = typeof en;

export const translations: Record<LanguageCode, Translations> = { en, nl, fr };
