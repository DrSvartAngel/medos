/**
 * MedOS — Learning Analytics Domain Models
 *
 * Factual, deterministic data types for topic, subject, and committee
 * study evidence, practice history, and mastery states.
 *
 * NO fake predictive intelligence, psychiatric inference, or composite readiness scores.
 */

export type TopicMasteryStatus =
  | 'unstudied'
  | 'needs_attention'
  | 'in_progress'
  | 'strong';

export type TopicNeglectStatus =
  | 'never_studied'
  | 'recent'
  | 'stale';

/**
 * Factual practice and review evidence gathered for a single topic across
 * all three MedOS study modalities: Q-Bank, Memory (SRS), and Focus.
 */
export interface TopicAnalyticsEvidence {
  topicId: string;
  subjectId: string;
  committeeId: string;
  topicName: string;

  // Q-Bank
  questionCount: number;
  correctCount: number;
  accuracyPercent: number | null;
  lastPracticedAt: number | null;

  // Memory
  linkedCardCount: number;
  dueCardCount: number;
  reviewCount: number;
  successfulReviewCount: number; // good + easy
  retentionPercent: number | null;
  lastReviewedAt: number | null;

  // Focus
  studySeconds: number;
  sessionCount: number;
  lastFocusedAt: number | null;

  // Derived dimensions
  lastActiveAt: number | null;
  practiced: boolean;
  masteryStatus: TopicMasteryStatus;
  neglectStatus: TopicNeglectStatus;
}

/**
 * Aggregated analytics for a Subject across its constituent topics.
 * Percentages are computed from raw totals, never by averaging topic percentages.
 */
export interface SubjectAnalyticsSummary {
  subjectId: string;
  committeeId: string;
  subjectName: string;
  totalTopics: number;
  practicedTopics: number;
  coveragePercent: number | null;

  // Aggregated Q-Bank
  totalQuestions: number;
  correctQuestions: number;
  qbankAccuracyPercent: number | null;

  // Aggregated Memory
  linkedCardCount: number;
  dueCardCount: number;
  totalReviews: number;
  successfulReviews: number;
  memoryRetentionPercent: number | null;

  // Aggregated Focus
  totalStudySeconds: number;
  totalFocusSessions: number;

  // Topic distribution
  needsAttentionTopicCount: number;
  strongTopicCount: number;
  inProgressTopicCount: number;
  unstudiedTopicCount: number;
  staleTopicCount: number;
  neverStudiedTopicCount: number;
}

/**
 * Aggregated analytics for an entire Committee across all subjects and topics.
 * Percentages are computed from raw totals, never by averaging child percentages.
 */
export interface CommitteeAnalyticsSummary {
  committeeId: string;
  totalSubjects: number;
  totalTopics: number;
  practicedTopics: number;
  coveragePercent: number | null;

  // Aggregated Q-Bank
  totalQuestions: number;
  correctQuestions: number;
  qbankAccuracyPercent: number | null;

  // Aggregated Memory
  linkedCardCount: number;
  dueCardCount: number;
  totalReviews: number;
  successfulReviews: number;
  memoryRetentionPercent: number | null;

  // Aggregated Focus
  totalStudySeconds: number;
  totalFocusSessions: number;

  // Topic distribution
  needsAttentionTopicCount: number;
  strongTopicCount: number;
  inProgressTopicCount: number;
  unstudiedTopicCount: number;
  staleTopicCount: number;
  neverStudiedTopicCount: number;
}

export type WeakTopicReason =
  | 'low_qbank_accuracy'
  | 'low_memory_retention'
  | 'due_reviews';

/**
 * Identified topic requiring review, with factual metrics explaining the attention trigger.
 */
export interface WeakTopicItem {
  topicId: string;
  subjectId: string;
  topicName: string;
  subjectName?: string;
  reasons: WeakTopicReason[];
  qbankAccuracyPercent: number | null;
  questionCount: number;
  memoryRetentionPercent: number | null;
  reviewCount: number;
  dueCardCount: number;
  lastActiveAt: number | null;
}

/**
 * Identified topic that has not been reviewed within the neglect threshold window.
 */
export interface NeglectedTopicItem {
  topicId: string;
  subjectId: string;
  topicName: string;
  subjectName?: string;
  neglectStatus: TopicNeglectStatus;
  status: TopicNeglectStatus;
  lastActiveAt: number | null;
  daysSinceActive: number | null;
}

/**
 * Factual multi-dimensional exam evidence summary.
 * Strictly avoids composite "Readiness %" or pseudo-scientific pass probabilities.
 */
export interface ExamEvidenceSummary {
  totalTopics: number;
  practicedTopics: number;
  coveragePercent: number | null;
  qbankQuestions: number;
  qbankAccuracyPercent: number | null;
  memoryRetentionPercent: number | null;
  dueCards: number;
  needsAttentionTopics: number;
  staleTopics: number;
  neverStudiedTopics: number;
  daysToExam: number | null;
}
