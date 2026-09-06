import en, { type Strings } from './en';
import tr from './tr';

/** Only for system errors, never user-authored content. Translate on render so
 * changing language does not mutate form, store, or persistence state. */
export function translateError(message: string, t: Strings): string {
  for (const section of ['systemErrors', 'studySupportMessages', 'sweep'] as const) {
    const english = en[section] as Record<string, unknown>;
    const turkish = tr[section] as Record<string, unknown>;
    const current = t[section] as Record<string, unknown>;
    for (const key of Object.keys(english)) {
      if ((key === message || english[key] === message || turkish[key] === message) && typeof current[key] === 'string') {
        return current[key] as string;
      }
    }
  }
  // Unexpected storage/driver diagnostics are not UI copy; never report success.
  return t.sweep.operationError;
}
