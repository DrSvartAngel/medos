/**
 * MedOS — Pure Deterministic Learning Analytics Rules
 *
 * Provides database-independent, React-independent calculation and classification
 * rules for learning analytics, topic mastery, neglect status, and curriculum aggregations.
 *
 * NOTE ON MASTERY THRESHOLDS:
 * The thresholds below are transparent product heuristics designed to help medical students
 * identify topics requiring attention or reinforcement. They are NOT scientifically
 * validated medical board exam pass/fail predictors.
 */

import type {
  TopicMasteryStatus,
  TopicNeglectStatus,
  TopicAnalyticsEvidence,
  SubjectAnalyticsSummary,
  CommitteeAnalyticsSummary,
  WeakTopicItem,
  WeakTopicReason,
  NeglectedTopicItem,
  ExamEvidenceSummary,
} from '@/models/analytics';
import {
  differenceInLocalCalendarDays,
  formatLocalDateKey,
} from './calendarDate';

// ---------------------------------------------------------------------------
// Named Heuristic Thresholds
// ---------------------------------------------------------------------------

/** Minimum questions required to trigger a low-accuracy attention alert */
export const QBANK_ATTENTION_MIN_QUESTIONS = 10;
/** Accuracy threshold below which a topic needs practice attention */
export const QBANK_ATTENTION_ACCURACY = 60;

/** Minimum reviews required to trigger a low-retention attention alert */
export const MEMORY_ATTENTION_MIN_REVIEWS = 5;
/** Retention threshold below which an active SRS topic needs attention */
export const MEMORY_ATTENTION_RETENTION = 70;

/** Minimum questions solved required before a topic can achieve Strong status */
export const QBANK_STRONG_MIN_QUESTIONS = 15;
/** Accuracy percentage required for Strong status */
export const QBANK_STRONG_ACCURACY = 75;

/** Minimum SRS reviews completed required before a topic can achieve Strong status */
export const MEMORY_STRONG_MIN_REVIEWS = 10;
/** Retention percentage required for Strong status */
export const MEMORY_STRONG_RETENTION = 80;

/** Number of calendar days without practice after which a topic is classified as Stale */
export const STALE_AFTER_DAYS = 14;

// ---------------------------------------------------------------------------
// Pure Elementary Calculations
// ---------------------------------------------------------------------------

/**
 * Calculates rounded accuracy percentage: round((correct / total) * 100).
 * Returns null if total <= 0 or inputs are invalid.
 */
export function calculateAccuracy(correct: number, total: number): number | null {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(correct) || correct < 0) {
    return null;
  }
  const safeCorrect = Math.min(Math.max(0, Math.floor(correct)), Math.floor(total));
  return Math.round((safeCorrect / Math.floor(total)) * 100);
}

/**
 * Calculates rounded retention percentage: round((successfulReviews / totalReviews) * 100).
 * Returns null if totalReviews <= 0 or inputs are invalid.
 */
export function calculateRetention(
  successfulReviews: number,
  totalReviews: number
): number | null {
  if (
    !Number.isFinite(totalReviews) ||
    totalReviews <= 0 ||
    !Number.isFinite(successfulReviews) ||
    successfulReviews < 0
  ) {
    return null;
  }
  const safeSuccessful = Math.min(
    Math.max(0, Math.floor(successfulReviews)),
    Math.floor(totalReviews)
  );
  return Math.round((safeSuccessful / Math.floor(totalReviews)) * 100);
}

/**
 * Derives the most recent study timestamp across Focus, Memory, and Q-Bank.
 * Returns null if all are null or <= 0.
 */
export function calculateLastActiveAt(
  lastFocusedAt: number | null,
  lastReviewedAt: number | null,
  lastPracticedAt: number | null
): number | null {
  const timestamps = [lastFocusedAt, lastReviewedAt, lastPracticedAt].filter(
    (ts): ts is number => typeof ts === 'number' && Number.isFinite(ts) && ts > 0
  );
  if (timestamps.length === 0) return null;
  return Math.max(...timestamps);
}

/**
 * Determines whether a topic has actual practice evidence.
 * Practice requires concluded Focus sessions, Memory reviews, or Q-Bank questions.
 * Merely having created flashcards does NOT count as practice.
 */
export function isPracticed(evidence: {
  sessionCount: number;
  reviewCount: number;
  questionCount: number;
}): boolean {
  const focus = Number.isFinite(evidence.sessionCount) && evidence.sessionCount > 0;
  const memory = Number.isFinite(evidence.reviewCount) && evidence.reviewCount > 0;
  const qbank = Number.isFinite(evidence.questionCount) && evidence.questionCount > 0;
  return focus || memory || qbank;
}

// ---------------------------------------------------------------------------
// Mastery Classification (Pure)
// ---------------------------------------------------------------------------

export interface TopicMasteryInput {
  questionCount: number;
  accuracyPercent: number | null;
  reviewCount: number;
  retentionPercent: number | null;
  dueCardCount: number;
  sessionCount: number;
}

/**
 * Classifies a topic into one of 4 deterministic mastery states.
 * Focus time is evidence of time investment, not correctness; it alone never grants 'strong'.
 */
export function classifyTopicMastery(input: TopicMasteryInput): TopicMasteryStatus {
  const practiced = isPracticed({
    sessionCount: input.sessionCount,
    reviewCount: input.reviewCount,
    questionCount: input.questionCount,
  });

  if (!practiced) {
    return 'unstudied';
  }

  // 1. Attention Triggers
  const lowAccuracy =
    input.questionCount >= QBANK_ATTENTION_MIN_QUESTIONS &&
    input.accuracyPercent !== null &&
    input.accuracyPercent < QBANK_ATTENTION_ACCURACY;

  const lowRetention =
    input.reviewCount >= MEMORY_ATTENTION_MIN_REVIEWS &&
    input.retentionPercent !== null &&
    input.retentionPercent < MEMORY_ATTENTION_RETENTION;

  const hasDueCards = Number.isFinite(input.dueCardCount) && input.dueCardCount > 0;

  if (lowAccuracy || lowRetention || hasDueCards) {
    return 'needs_attention';
  }

  // 2. Strong Criteria (ALL must be met)
  const strongQBank =
    input.questionCount >= QBANK_STRONG_MIN_QUESTIONS &&
    input.accuracyPercent !== null &&
    input.accuracyPercent >= QBANK_STRONG_ACCURACY;

  const strongMemory =
    input.reviewCount >= MEMORY_STRONG_MIN_REVIEWS &&
    input.retentionPercent !== null &&
    input.retentionPercent >= MEMORY_STRONG_RETENTION &&
    input.dueCardCount === 0;

  if (strongQBank && strongMemory) {
    return 'strong';
  }

  // 3. Otherwise in progress
  return 'in_progress';
}

// ---------------------------------------------------------------------------
// Neglect Classification (Pure)
// ---------------------------------------------------------------------------

/**
 * Classifies a topic's recency status based on local calendar days since last activity.
 * Returns 'never_studied' if lastActiveAt is null, 'stale' if >= 14 days, else 'recent'.
 */
export function classifyTopicNeglect(
  lastActiveAt: number | null,
  now = Date.now()
): TopicNeglectStatus {
  if (lastActiveAt === null || !Number.isFinite(lastActiveAt) || lastActiveAt <= 0) {
    return 'never_studied';
  }

  try {
    const fromDateKey = formatLocalDateKey(lastActiveAt);
    const toDateKey = formatLocalDateKey(now);
    const daysSince = differenceInLocalCalendarDays(fromDateKey, toDateKey);

    if (daysSince >= STALE_AFTER_DAYS) {
      return 'stale';
    }
    return 'recent';
  } catch {
    return 'never_studied';
  }
}

// ---------------------------------------------------------------------------
// Aggregation Rules (Pure)
// ---------------------------------------------------------------------------

/**
 * Calculates curriculum practice coverage percentage: round((practiced / total) * 100).
 * Returns null if totalTopics <= 0.
 */
export function calculateCoverage(
  practicedTopics: number,
  totalTopics: number
): number | null {
  if (!Number.isFinite(totalTopics) || totalTopics <= 0) {
    return null;
  }
  const safePracticed = Math.min(
    Math.max(0, Math.floor(practicedTopics)),
    Math.floor(totalTopics)
  );
  return Math.round((safePracticed / Math.floor(totalTopics)) * 100);
}

/**
 * Calculates aggregated Q-Bank accuracy across multiple topics from raw totals.
 * Never averages individual topic percentages.
 */
export function calculateAggregateAccuracy(
  correctQuestions: number,
  totalQuestions: number
): number | null {
  return calculateAccuracy(correctQuestions, totalQuestions);
}

/**
 * Calculates aggregated Memory retention across multiple topics from raw totals.
 * Never averages individual topic percentages.
 */
export function calculateAggregateRetention(
  successfulReviews: number,
  totalReviews: number
): number | null {
  return calculateRetention(successfulReviews, totalReviews);
}

/**
 * Identifies the specific reason(s) a topic was flagged as needing attention.
 */
export function identifyWeakTopicReasons(
  topic: TopicAnalyticsEvidence
): WeakTopicReason[] {
  const reasons: WeakTopicReason[] = [];

  if (
    topic.questionCount >= QBANK_ATTENTION_MIN_QUESTIONS &&
    topic.accuracyPercent !== null &&
    topic.accuracyPercent < QBANK_ATTENTION_ACCURACY
  ) {
    reasons.push('low_qbank_accuracy');
  }

  if (
    topic.reviewCount >= MEMORY_ATTENTION_MIN_REVIEWS &&
    topic.retentionPercent !== null &&
    topic.retentionPercent < MEMORY_ATTENTION_RETENTION
  ) {
    reasons.push('low_memory_retention');
  }

  if (topic.dueCardCount > 0) {
    reasons.push('due_reviews');
  }

  return reasons;
}

/**
 * Aggregates topic-level evidences into a SubjectAnalyticsSummary using raw sums.
 */
export function summarizeSubjectAnalytics(
  subjectId: string,
  committeeId: string,
  subjectName: string,
  topics: TopicAnalyticsEvidence[]
): SubjectAnalyticsSummary {
  let totalQuestions = 0;
  let correctQuestions = 0;
  let linkedCardCount = 0;
  let dueCardCount = 0;
  let totalReviews = 0;
  let successfulReviews = 0;
  let totalStudySeconds = 0;
  let totalFocusSessions = 0;
  let practicedTopics = 0;

  let needsAttentionTopicCount = 0;
  let strongTopicCount = 0;
  let inProgressTopicCount = 0;
  let unstudiedTopicCount = 0;
  let staleTopicCount = 0;
  let neverStudiedTopicCount = 0;

  for (const t of topics) {
    totalQuestions += t.questionCount;
    correctQuestions += t.correctCount;
    linkedCardCount += t.linkedCardCount;
    dueCardCount += t.dueCardCount;
    totalReviews += t.reviewCount;
    successfulReviews += t.successfulReviewCount;
    totalStudySeconds += t.studySeconds;
    totalFocusSessions += t.sessionCount;

    if (t.practiced) practicedTopics += 1;

    switch (t.masteryStatus) {
      case 'needs_attention':
        needsAttentionTopicCount += 1;
        break;
      case 'strong':
        strongTopicCount += 1;
        break;
      case 'in_progress':
        inProgressTopicCount += 1;
        break;
      case 'unstudied':
        unstudiedTopicCount += 1;
        break;
    }

    switch (t.neglectStatus) {
      case 'stale':
        staleTopicCount += 1;
        break;
      case 'never_studied':
        neverStudiedTopicCount += 1;
        break;
    }
  }

  const totalTopics = topics.length;

  return {
    subjectId,
    committeeId,
    subjectName,
    totalTopics,
    practicedTopics,
    coveragePercent: calculateCoverage(practicedTopics, totalTopics),
    totalQuestions,
    correctQuestions,
    qbankAccuracyPercent: calculateAccuracy(correctQuestions, totalQuestions),
    linkedCardCount,
    dueCardCount,
    totalReviews,
    successfulReviews,
    memoryRetentionPercent: calculateRetention(successfulReviews, totalReviews),
    totalStudySeconds,
    totalFocusSessions,
    needsAttentionTopicCount,
    strongTopicCount,
    inProgressTopicCount,
    unstudiedTopicCount,
    staleTopicCount,
    neverStudiedTopicCount,
  };
}

/**
 * Aggregates Subject-level summaries into a CommitteeAnalyticsSummary using raw sums.
 */
export function summarizeCommitteeAnalytics(
  committeeId: string,
  subjects: SubjectAnalyticsSummary[]
): CommitteeAnalyticsSummary {
  let totalTopics = 0;
  let practicedTopics = 0;
  let totalQuestions = 0;
  let correctQuestions = 0;
  let linkedCardCount = 0;
  let dueCardCount = 0;
  let totalReviews = 0;
  let successfulReviews = 0;
  let totalStudySeconds = 0;
  let totalFocusSessions = 0;

  let needsAttentionTopicCount = 0;
  let strongTopicCount = 0;
  let inProgressTopicCount = 0;
  let unstudiedTopicCount = 0;
  let staleTopicCount = 0;
  let neverStudiedTopicCount = 0;

  for (const s of subjects) {
    totalTopics += s.totalTopics;
    practicedTopics += s.practicedTopics;
    totalQuestions += s.totalQuestions;
    correctQuestions += s.correctQuestions;
    linkedCardCount += s.linkedCardCount;
    dueCardCount += s.dueCardCount;
    totalReviews += s.totalReviews;
    successfulReviews += s.successfulReviews;
    totalStudySeconds += s.totalStudySeconds;
    totalFocusSessions += s.totalFocusSessions;

    needsAttentionTopicCount += s.needsAttentionTopicCount;
    strongTopicCount += s.strongTopicCount;
    inProgressTopicCount += s.inProgressTopicCount;
    unstudiedTopicCount += s.unstudiedTopicCount;
    staleTopicCount += s.staleTopicCount;
    neverStudiedTopicCount += s.neverStudiedTopicCount;
  }

  return {
    committeeId,
    totalSubjects: subjects.length,
    totalTopics,
    practicedTopics,
    coveragePercent: calculateCoverage(practicedTopics, totalTopics),
    totalQuestions,
    correctQuestions,
    qbankAccuracyPercent: calculateAccuracy(correctQuestions, totalQuestions),
    linkedCardCount,
    dueCardCount,
    totalReviews,
    successfulReviews,
    memoryRetentionPercent: calculateRetention(successfulReviews, totalReviews),
    totalStudySeconds,
    totalFocusSessions,
    needsAttentionTopicCount,
    strongTopicCount,
    inProgressTopicCount,
    unstudiedTopicCount,
    staleTopicCount,
    neverStudiedTopicCount,
  };
}

/**
 * Produces a factual multi-dimensional exam evidence summary from committee analytics.
 * Strictly avoids any composite "Readiness %" or pseudo-scientific scores.
 */
export function summarizeExamEvidence(
  committeeSummary: CommitteeAnalyticsSummary,
  daysToExam: number | null
): ExamEvidenceSummary {
  return {
    totalTopics: committeeSummary.totalTopics,
    practicedTopics: committeeSummary.practicedTopics,
    coveragePercent: committeeSummary.coveragePercent,
    qbankQuestions: committeeSummary.totalQuestions,
    qbankAccuracyPercent: committeeSummary.qbankAccuracyPercent,
    memoryRetentionPercent: committeeSummary.memoryRetentionPercent,
    dueCards: committeeSummary.dueCardCount,
    needsAttentionTopics: committeeSummary.needsAttentionTopicCount,
    staleTopics: committeeSummary.staleTopicCount,
    neverStudiedTopics: committeeSummary.neverStudiedTopicCount,
    daysToExam,
  };
}
