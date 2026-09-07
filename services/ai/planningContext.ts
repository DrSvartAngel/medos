// MedOS — Phase 10 Step 10: AI Planning Context Builder
// Pure converter from persisted learning analytics evidence to provider-neutral AIStudyPlanningContext.

import type { AIStudyPlanningContext, AIStudyPlanningTopic } from '@/models/ai';
import type { TopicAnalyticsEvidence } from '@/models/analytics';
import {
  getWeakTopics,
  getNeglectedTopics,
} from '@/utils/analyticsPriorityRules';
import { identifyWeakTopicReasons } from '@/utils/analyticsRules';
import { getCommitteeDaysToExam } from '@/utils/committeeDate';

/**
 * Builds a factual, provider-neutral AIStudyPlanningContext from Committee and Topic analytics.
 *
 * Rules:
 * - NO fake readiness percentage or composite predictive score.
 * - Null metrics remain strictly null (unstudied is never 0%).
 * - Deterministic candidate selection (weak first, neglected second, up to maxCandidates).
 * - Pure function: zero database writes, zero network calls.
 */
export function buildPlanningContext(
  committee: { id: string; name: string; examDate?: number | null },
  topicEvidences: TopicAnalyticsEvidence[],
  subjectMap?: Record<string, string> | Map<string, string>,
  now = Date.now(),
  maxCandidates = 10
): AIStudyPlanningContext {
  const daysUntilExam = committee.examDate
    ? getCommitteeDaysToExam(committee.examDate)
    : null;

  if (!Array.isArray(topicEvidences) || topicEvidences.length === 0) {
    return {
      committeeId: committee.id,
      committeeName: committee.name,
      daysUntilExam,
      topics: [],
    };
  }

  // 1. Gather prioritized candidate topic IDs
  const weakItems = getWeakTopics(topicEvidences);
  const neglectedItems = getNeglectedTopics(topicEvidences, undefined, now);

  const selectedTopicIds = new Set<string>();
  const candidates: TopicAnalyticsEvidence[] = [];

  // Lookup map for fast evidence lookup by topicId
  const evidenceMap = new Map<string, TopicAnalyticsEvidence>();
  for (const ev of topicEvidences) {
    evidenceMap.set(ev.topicId, ev);
  }

  // Priority 1: Weak topics (needing attention)
  for (const item of weakItems) {
    if (candidates.length >= maxCandidates) break;
    const ev = evidenceMap.get(item.topicId);
    if (ev && !selectedTopicIds.has(item.topicId)) {
      selectedTopicIds.add(item.topicId);
      candidates.push(ev);
    }
  }

  // Priority 2: Neglected topics (never studied or stale)
  for (const item of neglectedItems) {
    if (candidates.length >= maxCandidates) break;
    const ev = evidenceMap.get(item.topicId);
    if (ev && !selectedTopicIds.has(item.topicId)) {
      selectedTopicIds.add(item.topicId);
      candidates.push(ev);
    }
  }

  // Priority 3: Topics with due cards
  if (candidates.length < maxCandidates) {
    for (const ev of topicEvidences) {
      if (candidates.length >= maxCandidates) break;
      if (!selectedTopicIds.has(ev.topicId) && ev.dueCardCount > 0) {
        selectedTopicIds.add(ev.topicId);
        candidates.push(ev);
      }
    }
  }

  // Priority 4: Any remaining topics (alphabetical by topic name)
  if (candidates.length < maxCandidates) {
    const remaining = topicEvidences
      .filter((ev) => !selectedTopicIds.has(ev.topicId))
      .sort((a, b) => a.topicName.localeCompare(b.topicName));

    for (const ev of remaining) {
      if (candidates.length >= maxCandidates) break;
      selectedTopicIds.add(ev.topicId);
      candidates.push(ev);
    }
  }

  // Map to AIStudyPlanningTopic
  const topics: AIStudyPlanningTopic[] = candidates.map((ev) => {
    const subjectName =
      subjectMap instanceof Map
        ? subjectMap.get(ev.subjectId) ?? ''
        : subjectMap?.[ev.subjectId] ?? '';

    const weakReasons = identifyWeakTopicReasons(ev);
    const neglectReasons: string[] = [];
    if (ev.neglectStatus === 'never_studied') {
      neglectReasons.push('never_studied');
    } else if (ev.neglectStatus === 'stale') {
      neglectReasons.push('stale');
    }

    return {
      topicId: ev.topicId,
      topicName: ev.topicName,
      subjectName,
      masteryStatus: ev.masteryStatus,
      neglectStatus: ev.neglectStatus,
      qbankQuestions: ev.questionCount > 0 ? ev.questionCount : null,
      qbankAccuracy: ev.accuracyPercent,
      memoryReviews: ev.reviewCount > 0 ? ev.reviewCount : null,
      memoryRetention: ev.retentionPercent,
      dueCards: ev.dueCardCount > 0 ? ev.dueCardCount : null,
      lastStudiedAt: ev.lastActiveAt,
      weakReasons,
      neglectReasons,
    };
  });

  return {
    committeeId: committee.id,
    committeeName: committee.name,
    daysUntilExam,
    topics,
  };
}
