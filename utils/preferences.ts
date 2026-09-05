export const DEFAULT_FOCUS_SEC = 25 * 60;

export type Language = 'en' | 'tr';
/** Existing installations stay English until the user chooses Turkish. */
export function normalizeLanguage(value: unknown): Language {
  return value === 'tr' ? 'tr' : 'en';
}

export const FOCUS_DURATION_OPTIONS = [15 * 60, 25 * 60, 45 * 60, 60 * 60] as const;
export type FocusDurationSec = (typeof FOCUS_DURATION_OPTIONS)[number];

export const DAILY_FOCUS_GOAL_OPTIONS = [30, 60, 90, 120] as const;
export type DailyFocusGoalMin = (typeof DAILY_FOCUS_GOAL_OPTIONS)[number];

export function isFocusDurationSec(value: unknown): value is FocusDurationSec {
  return (
    typeof value === 'number' &&
    FOCUS_DURATION_OPTIONS.some((option) => option === value)
  );
}

export function normalizeFocusDurationSec(value: unknown): FocusDurationSec {
  return isFocusDurationSec(value) ? value : DEFAULT_FOCUS_SEC;
}

export function isDailyFocusGoalMin(value: unknown): value is DailyFocusGoalMin {
  return (
    typeof value === 'number' &&
    DAILY_FOCUS_GOAL_OPTIONS.some((option) => option === value)
  );
}

export function normalizeDailyFocusGoalMin(value: unknown): DailyFocusGoalMin | null {
  return value === null || isDailyFocusGoalMin(value) ? value : null;
}

/** Only an explicitly persisted boolean true enables an optional preference. */
export function normalizeBooleanPreference(value: unknown): boolean {
  return value === true;
}
