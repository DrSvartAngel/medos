import { getDB } from '../client';
import type { FocusSession } from '@/store/useFocusStore';

interface FocusSessionRow {
  id: string;
  duration_sec: number;
  actual_duration_sec: number;
  completed: number;
  cancelled: number;
  committee_id: string | null;
  subject_id: string | null;
  topic_id: string | null;
  started_at: number;
  ended_at: number | null;
}

function rowToFocusSession(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    plannedSec: row.duration_sec,
    actualSec: row.actual_duration_sec,
    completed: row.completed === 1,
    cancelled: row.cancelled === 1,
    committeeId: row.committee_id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export const focusRepo = {
  getTopicContext(topicId: string): { id: string; name: string; subjectId: string; subjectName: string; committeeId: string } | null {
    return getDB().getFirstSync<{ id: string; name: string; subjectId: string; subjectName: string; committeeId: string }>(
      `SELECT t.id, t.name, s.id AS subjectId, s.name AS subjectName, c.id AS committeeId FROM topics t
       JOIN subjects s ON s.id = t.subject_id JOIN committees c ON c.id = s.committee_id
       WHERE t.id = ?`, [topicId]
    ) ?? null;
  },

  getSubjectContext(subjectId: string): { id: string; name: string; committeeId: string } | null {
    return getDB().getFirstSync<{ id: string; name: string; committeeId: string }>(
      `SELECT s.id, s.name, s.committee_id AS committeeId FROM subjects s
       JOIN committees c ON c.id = s.committee_id
       WHERE s.id = ?`, [subjectId]
    ) ?? null;
  },

  hasTopicStudyActivity(topicId: string): boolean {
    return !!getDB().getFirstSync(
      `SELECT id FROM focus_sessions WHERE topic_id = ?
       AND typeof(actual_duration_sec) = 'integer' AND actual_duration_sec > 0
       AND ended_at IS NOT NULL AND ended_at >= started_at
       AND ((completed = 1 AND cancelled = 0) OR
            (cancelled = 1 AND completed = 0 AND actual_duration_sec >= 30)) LIMIT 1`, [topicId]
    );
  },
  /** Returns only concluded sessions, newest first. */
  getRecent(limit = 10): FocusSession[] {
    const db = getDB();
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = db.getAllSync<FocusSessionRow>(
      `SELECT id, duration_sec, actual_duration_sec, completed, cancelled,
              committee_id, subject_id, topic_id, started_at, ended_at
       FROM focus_sessions
       WHERE completed = 1 OR cancelled = 1
       ORDER BY started_at DESC
       LIMIT ?`,
      [safeLimit]
    );
    return rows.map(rowToFocusSession);
  },

  insert(s: FocusSession): void {
    const db = getDB();
    // Validate and resolve canonical chain: Committee -> Subject -> Topic
    let committeeId = s.committeeId ?? null;
    let subjectId: string | null = null;
    let topicId: string | null = null;

    if (s.topicId) {
      const topicContext = this.getTopicContext(s.topicId);
      if (topicContext) {
        topicId = topicContext.id;
        subjectId = topicContext.subjectId;
        committeeId = topicContext.committeeId;
      }
    } else if (s.subjectId) {
      const subjectContext = this.getSubjectContext(s.subjectId);
      if (subjectContext) {
        subjectId = subjectContext.id;
        committeeId = subjectContext.committeeId;
      }
    }

    // Parameterized insert: VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    db.runSync(
      `INSERT INTO focus_sessions
         (id, duration_sec, actual_duration_sec, completed, cancelled,
          committee_id, subject_id, topic_id, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.plannedSec,
        s.actualSec,
        s.completed ? 1 : 0,
        s.cancelled ? 1 : 0,
        committeeId,
        subjectId,
        topicId,
        s.startedAt,
        s.endedAt,
      ]
    );
  },

  getById(id: string): FocusSession | null {
    const db = getDB();
    const row = db.getFirstSync<FocusSessionRow>(
      `SELECT id, duration_sec, actual_duration_sec, completed, cancelled,
              committee_id, subject_id, topic_id, started_at, ended_at
       FROM focus_sessions
       WHERE id = ?`,
      [id]
    );
    return row ? rowToFocusSession(row) : null;
  },

  /**
   * Updates academic context for an existing completed or cancelled session.
   * Strictly validates canonical hierarchy: Committee -> Subject -> Topic.
   * Does NOT modify duration, timestamps, or completion status.
   */
  updateAcademicContext(
    sessionId: string,
    context: {
      committeeId: string | null;
      subjectId?: string | null;
      topicId?: string | null;
    }
  ): boolean {
    const db = getDB();
    const existing = this.getById(sessionId);
    if (!existing) return false;

    let committeeId = context.committeeId ?? null;
    let subjectId: string | null = null;
    let topicId: string | null = null;

    if (context.topicId) {
      const topicContext = this.getTopicContext(context.topicId);
      if (!topicContext) {
        throw new Error(`Topic ${context.topicId} not found`);
      }
      if (context.subjectId && context.subjectId !== topicContext.subjectId) {
        throw new Error(
          `Inconsistent hierarchy: subjectId ${context.subjectId} does not match topic subject ${topicContext.subjectId}`
        );
      }
      if (context.committeeId && context.committeeId !== topicContext.committeeId) {
        throw new Error(
          `Inconsistent hierarchy: committeeId ${context.committeeId} does not match topic committee ${topicContext.committeeId}`
        );
      }
      topicId = topicContext.id;
      subjectId = topicContext.subjectId;
      committeeId = topicContext.committeeId;
    } else if (context.subjectId) {
      const subjectContext = this.getSubjectContext(context.subjectId);
      if (!subjectContext) {
        throw new Error(`Subject ${context.subjectId} not found`);
      }
      if (context.committeeId && context.committeeId !== subjectContext.committeeId) {
        throw new Error(
          `Inconsistent hierarchy: committeeId ${context.committeeId} does not match subject committee ${subjectContext.committeeId}`
        );
      }
      subjectId = subjectContext.id;
      committeeId = subjectContext.committeeId;
      topicId = null;
    } else if (context.committeeId) {
      committeeId = context.committeeId;
      subjectId = null;
      topicId = null;
    } else {
      committeeId = null;
      subjectId = null;
      topicId = null;
    }

    db.runSync(
      `UPDATE focus_sessions
       SET committee_id = ?, subject_id = ?, topic_id = ?
       WHERE id = ?`,
      [committeeId, subjectId, topicId, sessionId]
    );

    return true;
  },
};


