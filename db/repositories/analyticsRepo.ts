/**
 * MedOS — Learning Analytics Repository
 *
 * Provides batch-aggregated, factual study evidence for Topics, Subjects,
 * and Committees across Q-Bank, Memory (SRS), and Focus modalities.
 *
 * Implements single-pass CTE queries to prevent N+1 per-topic database calls.
 * All classification and rounding logic is delegated to pure rules in analyticsRules.ts.
 */

import { getDB } from '../client';
import type {
  TopicAnalyticsEvidence,
  SubjectAnalyticsSummary,
  CommitteeAnalyticsSummary,
} from '@/models/analytics';
import {
  calculateAccuracy,
  calculateRetention,
  calculateLastActiveAt,
  isPracticed,
  classifyTopicMastery,
  classifyTopicNeglect,
  summarizeSubjectAnalytics,
  summarizeCommitteeAnalytics,
} from '@/utils/analyticsRules';

interface RawTopicEvidenceRow {
  topic_id: string;
  subject_id: string;
  committee_id: string;
  topic_name: string;
  question_count: number;
  correct_count: number;
  last_practiced_at: number | null;
  linked_card_count: number;
  due_card_count: number;
  review_count: number;
  successful_review_count: number;
  last_reviewed_at: number | null;
  study_seconds: number;
  session_count: number;
  last_focused_at: number | null;
}

function mapRowToTopicEvidence(
  row: RawTopicEvidenceRow,
  now: number
): TopicAnalyticsEvidence {
  const questionCount = row.question_count;
  const correctCount = row.correct_count;
  const accuracyPercent = calculateAccuracy(correctCount, questionCount);
  const lastPracticedAt = row.last_practiced_at ?? null;

  const linkedCardCount = row.linked_card_count;
  const dueCardCount = row.due_card_count;
  const reviewCount = row.review_count;
  const successfulReviewCount = row.successful_review_count;
  const retentionPercent = calculateRetention(successfulReviewCount, reviewCount);
  const lastReviewedAt = row.last_reviewed_at ?? null;

  const studySeconds = row.study_seconds;
  const sessionCount = row.session_count;
  const lastFocusedAt = row.last_focused_at ?? null;

  const lastActiveAt = calculateLastActiveAt(
    lastFocusedAt,
    lastReviewedAt,
    lastPracticedAt
  );

  const practiced = isPracticed({
    sessionCount,
    reviewCount,
    questionCount,
  });

  const masteryStatus = classifyTopicMastery({
    questionCount,
    accuracyPercent,
    reviewCount,
    retentionPercent,
    dueCardCount,
    sessionCount,
  });

  const neglectStatus = classifyTopicNeglect(lastActiveAt, now);

  return {
    topicId: row.topic_id,
    subjectId: row.subject_id,
    committeeId: row.committee_id,
    topicName: row.topic_name,
    questionCount,
    correctCount,
    accuracyPercent,
    lastPracticedAt,
    linkedCardCount,
    dueCardCount,
    reviewCount,
    successfulReviewCount,
    retentionPercent,
    lastReviewedAt,
    studySeconds,
    sessionCount,
    lastFocusedAt,
    lastActiveAt,
    practiced,
    masteryStatus,
    neglectStatus,
  };
}

/**
 * Builds the parameterized batch CTE query for topic analytics.
 * Scopes topics by 'topic', 'subject', or 'committee' without per-topic N+1 loops.
 */
function buildTopicEvidenceQuery(scopeType: 'topic' | 'subject' | 'committee'): string {
  const scopePredicate =
    scopeType === 'topic'
      ? 't.id = ?'
      : scopeType === 'subject'
        ? 's.id = ?'
        : 'c.id = ?';

  return `
    WITH scope AS (
      SELECT
        t.id AS topic_id,
        t.name AS topic_name,
        s.id AS subject_id,
        c.id AS committee_id,
        t.created_at AS topic_created_at
      FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      JOIN committees c ON c.id = s.committee_id
      WHERE ${scopePredicate}
    ),
    qbank AS (
      SELECT
        qs.topic_id,
        SUM(qs.total_questions) AS question_count,
        SUM(qs.correct_count) AS correct_count,
        MAX(qs.created_at) AS last_practiced_at
      FROM qbank_sessions qs
      JOIN scope ON scope.topic_id = qs.topic_id
      GROUP BY qs.topic_id
    ),
    cards AS (
      SELECT
        f.topic_id,
        COUNT(*) AS linked_card_count,
        SUM(CASE WHEN f.schedule_state != 'unscheduled' AND f.next_review <= ? THEN 1 ELSE 0 END) AS due_card_count
      FROM flashcards f
      JOIN scope ON scope.topic_id = f.topic_id
      GROUP BY f.topic_id
    ),
    reviews AS (
      SELECT
        r.topic_id,
        COUNT(*) AS review_count,
        SUM(CASE WHEN r.rating IN ('good', 'easy') THEN 1 ELSE 0 END) AS successful_review_count,
        MAX(r.reviewed_at) AS last_reviewed_at
      FROM flashcard_reviews r
      JOIN scope ON scope.topic_id = r.topic_id
      GROUP BY r.topic_id
    ),
    study AS (
      SELECT
        fs.topic_id,
        SUM(fs.actual_duration_sec) AS study_seconds,
        COUNT(*) AS session_count,
        MAX(fs.ended_at) AS last_focused_at
      FROM focus_sessions fs
      JOIN scope ON scope.topic_id = fs.topic_id
      WHERE typeof(fs.actual_duration_sec) = 'integer'
        AND fs.actual_duration_sec > 0
        AND fs.ended_at IS NOT NULL
        AND fs.ended_at >= fs.started_at
        AND ((fs.completed = 1 AND fs.cancelled = 0) OR
             (fs.cancelled = 1 AND fs.completed = 0 AND fs.actual_duration_sec >= 30))
      GROUP BY fs.topic_id
    )
    SELECT
      scope.topic_id,
      scope.subject_id,
      scope.committee_id,
      scope.topic_name,
      COALESCE(qbank.question_count, 0) AS question_count,
      COALESCE(qbank.correct_count, 0) AS correct_count,
      qbank.last_practiced_at,
      COALESCE(cards.linked_card_count, 0) AS linked_card_count,
      COALESCE(cards.due_card_count, 0) AS due_card_count,
      COALESCE(reviews.review_count, 0) AS review_count,
      COALESCE(reviews.successful_review_count, 0) AS successful_review_count,
      reviews.last_reviewed_at,
      COALESCE(study.study_seconds, 0) AS study_seconds,
      COALESCE(study.session_count, 0) AS session_count,
      study.last_focused_at
    FROM scope
    LEFT JOIN qbank ON qbank.topic_id = scope.topic_id
    LEFT JOIN cards ON cards.topic_id = scope.topic_id
    LEFT JOIN reviews ON reviews.topic_id = scope.topic_id
    LEFT JOIN study ON study.topic_id = scope.topic_id
    ORDER BY scope.topic_created_at ASC, scope.topic_id ASC
  `;
}

export const analyticsRepo = {
  /**
   * Returns factual analytics evidence for a single topic, or null if not found.
   */
  getTopicAnalytics(topicId: string, now = Date.now()): TopicAnalyticsEvidence | null {
    if (typeof topicId !== 'string' || !topicId.trim()) return null;
    const db = getDB();
    const query = buildTopicEvidenceQuery('topic');
    const rows = db.getAllSync<RawTopicEvidenceRow>(query, [topicId.trim(), now]);
    if (rows.length === 0) return null;
    return mapRowToTopicEvidence(rows[0], now);
  },

  /**
   * Returns factual analytics evidence for all topics in a committee in a single query.
   * Excludes unlinked sessions and topics from other committees.
   */
  getCommitteeTopicAnalytics(
    committeeId: string,
    now = Date.now()
  ): TopicAnalyticsEvidence[] {
    if (typeof committeeId !== 'string' || !committeeId.trim()) return [];
    const db = getDB();
    const query = buildTopicEvidenceQuery('committee');
    const rows = db.getAllSync<RawTopicEvidenceRow>(query, [committeeId.trim(), now]);
    return rows.map((r) => mapRowToTopicEvidence(r, now));
  },

  /**
   * Returns aggregated analytics summary for a subject across its constituent topics.
   * Returns null if the subject does not exist.
   */
  getSubjectAnalytics(
    subjectId: string,
    now = Date.now()
  ): SubjectAnalyticsSummary | null {
    if (typeof subjectId !== 'string' || !subjectId.trim()) return null;
    const db = getDB();
    const subject = db.getFirstSync<{
      id: string;
      committee_id: string;
      name: string;
    }>('SELECT id, committee_id, name FROM subjects WHERE id = ?', [subjectId.trim()]);
    if (!subject) return null;

    const query = buildTopicEvidenceQuery('subject');
    const rows = db.getAllSync<RawTopicEvidenceRow>(query, [subject.id, now]);
    const topicEvidences = rows.map((r) => mapRowToTopicEvidence(r, now));

    return summarizeSubjectAnalytics(
      subject.id,
      subject.committee_id,
      subject.name,
      topicEvidences
    );
  },

  /**
   * Returns aggregated analytics summary for an entire committee across all constituent subjects.
   * Returns null if the committee does not exist.
   * Executes in a constant number of SQLite calls (no N+1 per topic).
   */
  getCommitteeAnalytics(
    committeeId: string,
    now = Date.now(),
    preloadedTopicEvidences?: TopicAnalyticsEvidence[]
  ): CommitteeAnalyticsSummary | null {
    if (typeof committeeId !== 'string' || !committeeId.trim()) return null;
    const db = getDB();
    const committee = db.getFirstSync<{ id: string; name: string }>(
      'SELECT id, name FROM committees WHERE id = ?',
      [committeeId.trim()]
    );
    if (!committee) return null;

    const subjects = db.getAllSync<{ id: string; name: string }>(
      'SELECT id, name FROM subjects WHERE committee_id = ? ORDER BY created_at ASC, id ASC',
      [committee.id]
    );

    // Batch query ALL topic evidences across the committee in 1 query (or reuse preloaded)
    const allTopicEvidences =
      preloadedTopicEvidences ?? this.getCommitteeTopicAnalytics(committee.id, now);

    // Group topic evidences by subjectId
    const topicsBySubject = new Map<string, TopicAnalyticsEvidence[]>();
    for (const te of allTopicEvidences) {
      let list = topicsBySubject.get(te.subjectId);
      if (!list) {
        list = [];
        topicsBySubject.set(te.subjectId, list);
      }
      list.push(te);
    }

    const subjectSummaries: SubjectAnalyticsSummary[] = subjects.map((s) =>
      summarizeSubjectAnalytics(
        s.id,
        committee.id,
        s.name,
        topicsBySubject.get(s.id) ?? []
      )
    );

    return summarizeCommitteeAnalytics(committee.id, subjectSummaries);
  },
};
