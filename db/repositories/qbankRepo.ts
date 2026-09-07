import { getDB } from '../client';
import type { QBankSession, CreateQBankSessionInput, QBankEvidenceSummary } from '@/models/qbank';


interface QBankSessionRow {
  id: string;
  topic_id: string | null;
  total_questions: number;
  correct_count: number;
  duration_sec: number | null;
  source_name: string | null;
  created_at: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function rowToQBankSession(row: QBankSessionRow): QBankSession {
  return {
    id: row.id,
    topicId: row.topic_id,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    durationSec: row.duration_sec,
    sourceName: row.source_name,
    createdAt: row.created_at,
  };
}

function validateSessionInput(input: CreateQBankSessionInput): QBankSession {
  const totalQuestions = input.totalQuestions;
  if (
    typeof totalQuestions !== 'number' ||
    !Number.isInteger(totalQuestions) ||
    totalQuestions <= 0
  ) {
    throw new Error('total_questions_invalid');
  }

  const correctCount = input.correctCount;
  if (
    typeof correctCount !== 'number' ||
    !Number.isInteger(correctCount) ||
    correctCount < 0 ||
    correctCount > totalQuestions
  ) {
    throw new Error('correct_count_invalid');
  }

  const durationSec = input.durationSec;
  if (
    durationSec !== null &&
    durationSec !== undefined &&
    (typeof durationSec !== 'number' ||
      !Number.isInteger(durationSec) ||
      durationSec < 0)
  ) {
    throw new Error('duration_sec_invalid');
  }

  const normalizedDuration = durationSec ?? null;
  const normalizedTopicId =
    typeof input.topicId === 'string' && input.topicId.trim().length > 0
      ? input.topicId.trim()
      : null;
  const normalizedSourceName =
    typeof input.sourceName === 'string' && input.sourceName.trim().length > 0
      ? input.sourceName.trim()
      : null;

  return {
    id: generateId(),
    topicId: normalizedTopicId,
    totalQuestions,
    correctCount,
    durationSec: normalizedDuration,
    sourceName: normalizedSourceName,
    createdAt: Date.now(),
  };
}

export const qbankRepo = {
  /** Inserts a new Q-Bank practice session after validating input constraints. */
  insert(input: CreateQBankSessionInput): QBankSession {
    const session = validateSessionInput(input);
    const db = getDB();
    try {
      db.runSync(
        `INSERT INTO qbank_sessions
           (id, topic_id, total_questions, correct_count, duration_sec, source_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.topicId,
          session.totalQuestions,
          session.correctCount,
          session.durationSec,
          session.sourceName,
          session.createdAt,
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (session.topicId && /FOREIGN KEY/i.test(msg)) {
        throw new Error('The selected topic is no longer available. Choose another topic or continue without one.');
      }
      throw err;
    }
    return session;
  },

  /** Deletes a Q-Bank session by id. Returns true if a row was removed. */
  delete(id: string): boolean {
    if (typeof id !== 'string' || !id.trim()) {
      return false;
    }
    const db = getDB();
    const result = db.runSync('DELETE FROM qbank_sessions WHERE id = ?', [id.trim()]);
    return result.changes > 0;
  },

  /** Returns recent Q-Bank sessions, newest first. */
  getRecent(limit = 20): QBankSession[] {
    const db = getDB();
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = db.getAllSync<QBankSessionRow>(
      `SELECT id, topic_id, total_questions, correct_count, duration_sec, source_name, created_at
       FROM qbank_sessions
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows.map(rowToQBankSession);
  },

  /** Returns all Q-Bank sessions linked to a specific topic, newest first. */
  getByTopic(topicId: string): QBankSession[] {
    if (typeof topicId !== 'string' || !topicId.trim()) {
      return [];
    }
    const db = getDB();
    const rows = db.getAllSync<QBankSessionRow>(
      `SELECT id, topic_id, total_questions, correct_count, duration_sec, source_name, created_at
       FROM qbank_sessions
       WHERE topic_id = ?
       ORDER BY created_at DESC, id DESC`,
      [topicId.trim()]
    );
    return rows.map(rowToQBankSession);
  },

  /** Returns a single Q-Bank session by id, or null if not found. */
  getById(id: string): QBankSession | null {
    if (typeof id !== 'string' || !id.trim()) {
      return null;
    }
    const db = getDB();
    const row = db.getFirstSync<QBankSessionRow>(
      `SELECT id, topic_id, total_questions, correct_count, duration_sec, source_name, created_at
       FROM qbank_sessions
       WHERE id = ?`,
      [id.trim()]
    );
    return row ? rowToQBankSession(row) : null;
  },

  /** Returns aggregated Q-Bank evidence (total questions, correct count, accuracy) for a topic. */
  getTopicEvidence(topicId: string): QBankEvidenceSummary {
    if (typeof topicId !== 'string' || !topicId.trim()) {
      return { totalQuestions: 0, correctCount: 0, accuracyPercent: null };
    }
    const db = getDB();
    const row = db.getFirstSync<{ total_questions: number; correct_count: number }>(
      `SELECT
         COALESCE(SUM(total_questions), 0) AS total_questions,
         COALESCE(SUM(correct_count), 0) AS correct_count
       FROM qbank_sessions
       WHERE topic_id = ?`,
      [topicId.trim()]
    );
    const totalQuestions = row?.total_questions ?? 0;
    const correctCount = row?.correct_count ?? 0;
    const accuracyPercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : null;

    return {
      totalQuestions,
      correctCount,
      accuracyPercent,
    };
  },

  /** Returns aggregated Q-Bank evidence across all linked topics for a committee. */
  getCommitteeEvidence(committeeId: string): QBankEvidenceSummary {
    if (typeof committeeId !== 'string' || !committeeId.trim()) {
      return { totalQuestions: 0, correctCount: 0, accuracyPercent: null };
    }
    const db = getDB();
    const row = db.getFirstSync<{ total_questions: number; correct_count: number }>(
      `SELECT
         COALESCE(SUM(qs.total_questions), 0) AS total_questions,
         COALESCE(SUM(qs.correct_count), 0) AS correct_count
       FROM qbank_sessions qs
       JOIN topics t ON t.id = qs.topic_id
       JOIN subjects s ON s.id = t.subject_id
       WHERE s.committee_id = ?`,
      [committeeId.trim()]
    );
    const totalQuestions = row?.total_questions ?? 0;
    const correctCount = row?.correct_count ?? 0;
    const accuracyPercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : null;

    return {
      totalQuestions,
      correctCount,
      accuracyPercent,
    };
  },
};

