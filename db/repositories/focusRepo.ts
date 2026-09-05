import { getDB } from '../client';
import type { FocusSession } from '@/store/useFocusStore';

interface FocusSessionRow {
  id: string;
  duration_sec: number;
  actual_duration_sec: number;
  completed: number;
  cancelled: number;
  committee_id: string | null;
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
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export const focusRepo = {
  /** Returns only concluded sessions, newest first. */
  getRecent(limit = 10): FocusSession[] {
    const db = getDB();
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = db.getAllSync<FocusSessionRow>(
      `SELECT id, duration_sec, actual_duration_sec, completed, cancelled,
              committee_id, started_at, ended_at
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
    db.runSync(
      `INSERT INTO focus_sessions
         (id, duration_sec, actual_duration_sec, completed, cancelled,
          committee_id, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.plannedSec,
        s.actualSec,
        s.completed ? 1 : 0,
        s.cancelled ? 1 : 0,
        s.committeeId,
        s.startedAt,
        s.endedAt,
      ]
    );
  },
};
