/**
 * MedOS — Pure Deterministic Learning Analytics Priority Engine
 *
 * Prioritizes topics needing review (Weak topics) and neglected curriculum areas (Neglected topics)
 * using transparent, deterministic comparators.
 *
 * STRICT PRODUCT PRINCIPLES:
 * - NO hidden numerical scores or pseudo-scientific "weakness algorithms"
 * - NO composite "Readiness %" or exam pass probabilities
 * - Weakness and Neglect are separate orthogonal dimensions (a strong topic can be stale)
 * - Sample-size-gated: unstudied / small samples are NEVER treated as 0% accuracy or 0% retention
 * - Pure functions with zero side-effects and zero database dependencies
 */

import type {
  TopicAnalyticsEvidence,
  WeakTopicItem,
  NeglectedTopicItem,
} from '@/models/analytics';
import {
  QBANK_ATTENTION_MIN_QUESTIONS,
  MEMORY_ATTENTION_MIN_REVIEWS,
  identifyWeakTopicReasons,
} from './analyticsRules';
import {
  formatLocalDateKey,
  differenceInLocalCalendarDays,
} from './calendarDate';

/**
 * Transparent deterministic comparator for ordering weak topics.
 *
 * Hierarchy:
 * 1. Multiple weakness reasons before single-reason topics
 * 2. Due reviews present (immediate actionable SRS load)
 * 3. Lower Q-Bank accuracy, when sample-size-qualified
 * 4. Lower Memory retention, when sample-size-qualified
 * 5. Higher due card count (when both have due reviews)
 * 6. Older lastActiveAt (least recently touched first; null means never active)
 * 7. Canonical topic name / ID tie-break (strictly deterministic)
 */
export function compareWeakTopics(a: WeakTopicItem, b: WeakTopicItem): number {
  // 1. Multiple weakness reasons before single-reason topics
  if (b.reasons.length !== a.reasons.length) {
    return b.reasons.length - a.reasons.length;
  }

  // 2. Due reviews present
  const aHasDue = a.dueCardCount > 0;
  const bHasDue = b.dueCardCount > 0;
  if (aHasDue !== bHasDue) {
    return aHasDue ? -1 : 1;
  }

  // 3. Lower Q-Bank accuracy, when sample-size-qualified (min 10 questions)
  const aQBankQualified =
    a.questionCount >= QBANK_ATTENTION_MIN_QUESTIONS &&
    a.qbankAccuracyPercent !== null;
  const bQBankQualified =
    b.questionCount >= QBANK_ATTENTION_MIN_QUESTIONS &&
    b.qbankAccuracyPercent !== null;

  if (aQBankQualified && bQBankQualified) {
    if (a.qbankAccuracyPercent !== b.qbankAccuracyPercent) {
      return a.qbankAccuracyPercent! - b.qbankAccuracyPercent!;
    }
  } else if (aQBankQualified !== bQBankQualified) {
    // A qualified weakness on Q-Bank takes precedence over unqualified
    return aQBankQualified ? -1 : 1;
  }

  // 4. Lower Memory retention, when sample-size-qualified (min 5 reviews)
  const aMemoryQualified =
    a.reviewCount >= MEMORY_ATTENTION_MIN_REVIEWS &&
    a.memoryRetentionPercent !== null;
  const bMemoryQualified =
    b.reviewCount >= MEMORY_ATTENTION_MIN_REVIEWS &&
    b.memoryRetentionPercent !== null;

  if (aMemoryQualified && bMemoryQualified) {
    if (a.memoryRetentionPercent !== b.memoryRetentionPercent) {
      return a.memoryRetentionPercent! - b.memoryRetentionPercent!;
    }
  } else if (aMemoryQualified !== bMemoryQualified) {
    // A qualified weakness on Memory takes precedence over unqualified
    return aMemoryQualified ? -1 : 1;
  }

  // 5. Higher due card count (when both have due reviews)
  if (aHasDue && bHasDue && b.dueCardCount !== a.dueCardCount) {
    return b.dueCardCount - a.dueCardCount;
  }

  // 6. Older lastActiveAt (smaller timestamp = touched longer ago; null = never active)
  if (a.lastActiveAt !== b.lastActiveAt) {
    if (a.lastActiveAt === null) return -1;
    if (b.lastActiveAt === null) return 1;
    return a.lastActiveAt - b.lastActiveAt;
  }

  // 7. Deterministic tie-break by name, then ID
  const nameCmp = a.topicName.localeCompare(b.topicName);
  if (nameCmp !== 0) return nameCmp;
  return a.topicId.localeCompare(b.topicId);
}

/**
 * Filters and orders topics needing attention into a prioritized WeakTopicItem list.
 *
 * Strictly qualifies only topics with `masteryStatus === 'needs_attention'`.
 * Unstudied, in_progress, and strong topics are excluded.
 * Does not mutate the source array.
 */
export function getWeakTopics(
  topics: TopicAnalyticsEvidence[],
  limit?: number
): WeakTopicItem[] {
  if (!Array.isArray(topics) || topics.length === 0) {
    return [];
  }

  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    return [];
  }

  // 1. Qualification: ONLY topics with masteryStatus === 'needs_attention'
  const qualifying = topics.filter((t) => t.masteryStatus === 'needs_attention');

  // 2. Map to factual WeakTopicItem
  const items: WeakTopicItem[] = qualifying.map((t) => ({
    topicId: t.topicId,
    subjectId: t.subjectId,
    topicName: t.topicName,
    reasons: identifyWeakTopicReasons(t),
    qbankAccuracyPercent: t.accuracyPercent,
    questionCount: t.questionCount,
    memoryRetentionPercent: t.retentionPercent,
    reviewCount: t.reviewCount,
    dueCardCount: t.dueCardCount,
    lastActiveAt: t.lastActiveAt,
  }));

  // 3. Deterministic priority sort
  items.sort(compareWeakTopics);

  // 4. Safe limit slice
  if (limit !== undefined) {
    return items.slice(0, Math.floor(limit));
  }

  return items;
}

/**
 * Transparent deterministic comparator for ordering neglected topics.
 *
 * Hierarchy:
 * 1. never_studied topics first
 * 2. stale topics, oldest activity first (least recently studied)
 * 3. Canonical topic name / ID tie-break (strictly deterministic)
 */
export function compareNeglectedTopics(
  a: NeglectedTopicItem,
  b: NeglectedTopicItem
): number {
  // 1. never_studied before stale
  if (a.neglectStatus !== b.neglectStatus) {
    if (a.neglectStatus === 'never_studied') return -1;
    if (b.neglectStatus === 'never_studied') return 1;
  }

  // 2. stale topics: oldest activity first (smaller timestamp = studied longer ago)
  if (a.neglectStatus === 'stale' && b.neglectStatus === 'stale') {
    if (a.lastActiveAt !== b.lastActiveAt) {
      if (a.lastActiveAt === null) return -1;
      if (b.lastActiveAt === null) return 1;
      return a.lastActiveAt - b.lastActiveAt;
    }
  }

  // 3. Deterministic tie-break by name, then ID
  const nameCmp = a.topicName.localeCompare(b.topicName);
  if (nameCmp !== 0) return nameCmp;
  return a.topicId.localeCompare(b.topicId);
}

/**
 * Filters and orders neglected curriculum areas into a prioritized NeglectedTopicItem list.
 *
 * Strictly qualifies topics with `neglectStatus === 'never_studied'` or `'stale'`.
 * Recent topics are excluded.
 * Derives factual `daysSinceActive` using local calendar days for stale topics.
 * Does not mutate the source array.
 */
export function getNeglectedTopics(
  topics: TopicAnalyticsEvidence[],
  limit?: number,
  now = Date.now()
): NeglectedTopicItem[] {
  if (!Array.isArray(topics) || topics.length === 0) {
    return [];
  }

  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    return [];
  }

  // 1. Qualification: never_studied or stale (recent is excluded)
  const qualifying = topics.filter(
    (t) => t.neglectStatus === 'never_studied' || t.neglectStatus === 'stale'
  );

  // 2. Map to factual NeglectedTopicItem
  const items: NeglectedTopicItem[] = qualifying.map((t) => {
    let daysSinceActive: number | null = null;

    if (
      t.neglectStatus === 'stale' &&
      typeof t.lastActiveAt === 'number' &&
      Number.isFinite(t.lastActiveAt) &&
      t.lastActiveAt > 0
    ) {
      try {
        const fromDateKey = formatLocalDateKey(t.lastActiveAt);
        const toDateKey = formatLocalDateKey(now);
        daysSinceActive = differenceInLocalCalendarDays(fromDateKey, toDateKey);
      } catch {
        daysSinceActive = null;
      }
    }

    return {
      topicId: t.topicId,
      subjectId: t.subjectId,
      topicName: t.topicName,
      neglectStatus: t.neglectStatus,
      status: t.neglectStatus,
      lastActiveAt: t.lastActiveAt,
      daysSinceActive,
    };
  });

  // 3. Deterministic priority sort
  items.sort(compareNeglectedTopics);

  // 4. Safe limit slice
  if (limit !== undefined) {
    return items.slice(0, Math.floor(limit));
  }

  return items;
}

/**
 * Pure helper for committee-wide weak topic prioritization.
 */
export function getCommitteeWeakTopics(
  topics: TopicAnalyticsEvidence[],
  limit?: number
): WeakTopicItem[] {
  return getWeakTopics(topics, limit);
}

/**
 * Pure helper for committee-wide neglected topic prioritization.
 */
export function getCommitteeNeglectedTopics(
  topics: TopicAnalyticsEvidence[],
  limit?: number,
  now = Date.now()
): NeglectedTopicItem[] {
  return getNeglectedTopics(topics, limit, now);
}
