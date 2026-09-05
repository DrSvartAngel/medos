import { getDB } from '../client';

export interface CommitteeTimelineSource {
  id: string;
  name: string;
  startDate: number;
  examDate: number;
}

export interface FocusTimelineSource {
  id: string;
  actualSec: number;
  committeeId: string | null;
  committeeName: string | null;
  startedAt: number;
}

export interface MemoryReviewTimelineSource {
  deckId: string;
  deckName: string;
  reviewedAt: number;
}

interface CommitteeTimelineRow {
  id: string;
  name: string;
  start_date: number;
  exam_date: number;
}

interface FocusTimelineRow {
  id: string;
  actual_duration_sec: number;
  committee_id: string | null;
  committee_name: string | null;
  started_at: number;
}

interface MemoryReviewTimelineRow {
  deck_id: string;
  deck_name: string;
  reviewed_at: number;
}

export const timelineRepo = {
  getCommitteeDatesByRange(startMs: number, endMs: number): CommitteeTimelineSource[] {
    const db = getDB();
    const rows = db.getAllSync<CommitteeTimelineRow>(
      `SELECT id, name, start_date, exam_date
       FROM committees
       WHERE (start_date > 0 AND start_date >= ? AND start_date < ?)
          OR (exam_date > 0 AND exam_date >= ? AND exam_date < ?)
       ORDER BY exam_date ASC, id ASC`,
      [startMs, endMs, startMs, endMs]
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      examDate: row.exam_date,
    }));
  },

  getCompletedFocusByRange(startMs: number, endMs: number): FocusTimelineSource[] {
    const db = getDB();
    const rows = db.getAllSync<FocusTimelineRow>(
      `SELECT f.id, f.actual_duration_sec, f.committee_id, f.started_at,
              c.name AS committee_name
       FROM focus_sessions f
       LEFT JOIN committees c ON c.id = f.committee_id
       WHERE f.completed = 1 AND f.cancelled = 0
         AND f.started_at >= ? AND f.started_at < ?
       ORDER BY f.started_at ASC, f.id ASC`,
      [startMs, endMs]
    );
    return rows.map((row) => ({
      id: row.id,
      actualSec: row.actual_duration_sec,
      committeeId: row.committee_id,
      committeeName: row.committee_name,
      startedAt: row.started_at,
    }));
  },

  getMemoryReviewsByRange(startMs: number, endMs: number): MemoryReviewTimelineSource[] {
    const db = getDB();
    const rows = db.getAllSync<MemoryReviewTimelineRow>(
      `SELECT d.id AS deck_id, d.name AS deck_name, r.reviewed_at
       FROM flashcard_reviews r
       INNER JOIN flashcards f ON f.id = r.card_id
       INNER JOIN decks d ON d.id = f.deck_id
       WHERE r.reviewed_at >= ? AND r.reviewed_at < ?
       ORDER BY r.reviewed_at ASC, r.id ASC`,
      [startMs, endMs]
    );
    return rows.map((row) => ({
      deckId: row.deck_id,
      deckName: row.deck_name,
      reviewedAt: row.reviewed_at,
    }));
  },
};
