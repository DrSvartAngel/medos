import type { Strings } from './en';

/** Translate only known system messages at render time, not stored domain data.
 * Keeping canonical notices in existing state avoids language changes resetting
 * Check-In answers, Committee opt-out, or Recovery refresh subscriptions.
 */
export function translateStudySupportMessage(message: string, t: Strings): string {
  const translated = t.studySupportMessages[
    message as keyof Strings['studySupportMessages']
  ];
  return typeof translated === 'string' ? translated : message;
}
