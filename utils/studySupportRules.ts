import {
  getLocalDayRange,
  todayLocalDateKey,
  type LocalDateKey,
} from './calendarDate';

export type CheckInEnergy = 'low' | 'steady' | 'good';
export type CheckInAttention = 'scattered' | 'okay' | 'focused';
export type AdaptiveDurationSec = 120 | 900 | 1500 | 2700;

export interface AdaptiveRecommendation {
  durationSec: AdaptiveDurationSec;
  reason: string;
}

export interface CheckInFreshness {
  capturedAt: number | null;
  localDateKey: LocalDateKey | null;
}

export const CHECK_IN_FRESHNESS_MS = 2 * 60 * 60 * 1000;

export const ADAPTIVE_DURATION_OPTIONS: readonly AdaptiveDurationSec[] = [
  120,
  900,
  1500,
  2700,
];

const ENERGY_VALUES: readonly CheckInEnergy[] = ['low', 'steady', 'good'];
const ATTENTION_VALUES: readonly CheckInAttention[] = [
  'scattered',
  'okay',
  'focused',
];

const RECOMMENDATIONS: Record<
  CheckInEnergy,
  Record<CheckInAttention, AdaptiveRecommendation>
> = {
  low: {
    scattered: {
      durationSec: 120,
      reason: 'A two-minute start may make beginning easier right now.',
    },
    okay: {
      durationSec: 900,
      reason: 'A 15-minute block keeps the starting step light.',
    },
    focused: {
      durationSec: 900,
      reason: 'A 15-minute block keeps the starting step light.',
    },
  },
  steady: {
    scattered: {
      durationSec: 900,
      reason: 'A 15-minute block may be easier to settle into.',
    },
    okay: {
      durationSec: 1500,
      reason: 'A 25-minute block is a balanced starting point.',
    },
    focused: {
      durationSec: 1500,
      reason: 'A 25-minute block is a balanced starting point.',
    },
  },
  good: {
    scattered: {
      durationSec: 900,
      reason: 'A 15-minute block keeps the plan simple while attention feels scattered.',
    },
    okay: {
      durationSec: 1500,
      reason: 'A 25-minute block is a steady starting point.',
    },
    focused: {
      durationSec: 2700,
      reason: 'A 45-minute block may fit the energy and attention you selected.',
    },
  },
};

export function isCheckInEnergy(value: unknown): value is CheckInEnergy {
  return typeof value === 'string' && ENERGY_VALUES.includes(value as CheckInEnergy);
}

export function isCheckInAttention(value: unknown): value is CheckInAttention {
  return (
    typeof value === 'string' && ATTENTION_VALUES.includes(value as CheckInAttention)
  );
}

export function isAdaptiveDurationSec(value: unknown): value is AdaptiveDurationSec {
  return (
    typeof value === 'number' &&
    ADAPTIVE_DURATION_OPTIONS.includes(value as AdaptiveDurationSec)
  );
}

export function isStandardAdaptiveDurationSec(
  value: unknown
): value is Exclude<AdaptiveDurationSec, 120> {
  return value === 900 || value === 1500 || value === 2700;
}

export function getAdaptiveRecommendation(
  energy: unknown,
  attention: unknown
): AdaptiveRecommendation | null {
  if (!isCheckInEnergy(energy) || !isCheckInAttention(attention)) return null;
  return RECOMMENDATIONS[energy][attention];
}

export function isCheckInFresh(
  freshness: CheckInFreshness,
  now = Date.now()
): boolean {
  if (
    freshness.capturedAt === null ||
    !Number.isFinite(freshness.capturedAt) ||
    freshness.localDateKey === null ||
    !Number.isFinite(now)
  ) {
    return false;
  }

  const age = now - freshness.capturedAt;
  return (
    age >= 0 &&
    age < CHECK_IN_FRESHNESS_MS &&
    freshness.localDateKey === todayLocalDateKey(new Date(now))
  );
}

export function getCheckInExpiresAt(
  freshness: CheckInFreshness
): number | null {
  if (
    freshness.capturedAt === null ||
    !Number.isFinite(freshness.capturedAt) ||
    freshness.localDateKey === null
  ) {
    return null;
  }

  try {
    const { endMs } = getLocalDayRange(freshness.localDateKey);
    return Math.min(freshness.capturedAt + CHECK_IN_FRESHNESS_MS, endMs);
  } catch {
    return null;
  }
}

export function formatAdaptiveDuration(durationSec: AdaptiveDurationSec): string {
  return durationSec === 120 ? '2 min' : `${durationSec / 60} min`;
}

export function formatCheckInSummary(
  energy: CheckInEnergy,
  attention: CheckInAttention
): string {
  const energyLabel = energy[0].toUpperCase() + energy.slice(1);
  const attentionLabel = attention[0].toUpperCase() + attention.slice(1);
  return `${energyLabel} energy · ${attentionLabel} attention`;
}
