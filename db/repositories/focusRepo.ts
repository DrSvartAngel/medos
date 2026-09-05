import { getDB } from '../client';
import type { FocusSession } from '@/store/useFocusStore';

interface FocusSessionRow {
  id: string;
  duration_sec: number;
  actual_duration_sec: number;
  completed: number;
  cancelled: number;
  committee_id: string | null;
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
    topicId: row.topic_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export const focusRepo = {
  getTopicContext(topicId: string): { id: string; name: string; committeeId: string } | null {
    return getDB().getFirstSync<{ id: string; name: string; committeeId: string }>(
      `SELECT t.id, t.name, c.id AS committeeId FROM topics t
       JOIN subjects s ON s.id = t.subject_id JOIN committees c ON c.id = s.committee_id
       WHERE t.id = ?`, [topicId]
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
              committee_id, topic_id, started_at, ended_at
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
    // A deleted Topic must not prevent saving real Focus history.
    const context = s.topicId ? this.getTopicContext(s.topicId) : null;
    const topicId = context?.committeeId === s.committeeId ? context?.id ?? null : null;
    db.runSync(
      `INSERT INTO focus_sessions
         (id, duration_sec, actual_duration_sec, completed, cancelled,
          committee_id, topic_id, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.plannedSec,
        s.actualSec,
        s.completed ? 1 : 0,
        s.cancelled ? 1 : 0,
        s.committeeId,
        topicId,
        s.startedAt,
        s.endedAt,
      ]
    );
  },
};
