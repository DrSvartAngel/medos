// MedOS i18n — lightweight translation hook.
// No external library. Language is user-toggled and persisted in useAppStore.
// Default/fallback: English; Turkish is explicitly chosen in Profile.
//
// Usage:
//   const t = useTranslation();
//   <AppText>{t.focus.title}</AppText>
//   <AppText>{t.focus.milestone.continueToDefault(25)}</AppText>

import en from './en';
import tr from './tr';
import { useAppStore } from '@/store/useAppStore';
import { normalizeLanguage } from '@/utils/preferences';

export type { Language } from '@/utils/preferences';

const locales = { en, tr } as const;

/** Returns the full string map for the current app language. */
export function useTranslation() {
  const language = useAppStore((state) => state.language);
  return getTranslation(language);
}

/** Returns strings for a given language without a hook (for use outside components). */
export function getTranslation(language: unknown) {
  return locales[normalizeLanguage(language)];
}

export { en, tr };
export { translateStudySupportMessage } from './studySupport';
