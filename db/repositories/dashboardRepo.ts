import { getDB } from '../client';

export interface DashboardCommitteeSource {
  id: string;
  name: string;
  color: string;
  startDate: number;
  examDate: number;
}

export interface DashboardFocusSource {
  completedSessions: number;
  totalSeconds: number;
}

export interface DashboardMemorySource {
  reviewCount: number;
  decksReviewed: number;
  againCount: number;
  hardCount: number;
}

export interface DashboardWeakDeckSource {
  deckId: string;
  deckName: string;
  attentionCount: number;
  lastAttentionAt: number;
}

interface CommitteeRow {
  id: string;
  name: string;
  color: string;
  start_date: number;
  exam_date: number;
}

interface FocusSummaryRow {
  completed_sessions: number;
  total_seconds: number | null;
}

interface MemorySummaryRow {
  review_count: number;
  decks_reviewed: number;
  again_count: number | null;
  hard_count: number | null;
}

interface WeakDeckRow {
  deck_id: string;
  deck_name: string;
  attention_count: number;
  last_attention_at: number;
}

export const dashboardRepo = {
  getRelevantCommittee(dayStartMs: number, dayEndMs: number): DashboardCommitteeSource | null {
    const db = getDB();
    const row = db.getFirstSync<CommitteeRow>(
      `SELECT id, name, color, start_date, exam_date
       FROM committees
       WHERE start_date > 0 AND exam_date > 0 AND exam_date >= start_date
       ORDER BY
         CASE
           WHEN start_date < ? AND exam_date >= ? THEN 0
           WHEN start_date >= ? THEN 1
           ELSE 2
         END ASC,
         CASE WHEN start_date < ? AND exam_date >= ? THEN exam_date END ASC,
         CASE WHEN start_date >= ? THEN start_date END ASC,
         CASE WHEN start_date >= ? THEN exam_date END ASC,
         CASE WHEN exam_date < ? THEN exam_date END DESC,
         id ASC
       LIMIT 1`,
      [
        dayEndMs,
        dayStartMs,
        dayEndMs,
        dayEndMs,
        dayStartMs,
        dayEndMs,
        dayEndMs,
        dayStartMs,
      ]
    );

    return row
      ? {
          id: row.id,
          name: row.name,
          color: row.color,
          startDate: row.start_date,
          examDate: row.exam_date,
        }
      : null;
  },

  getFocusSummary(dayStartMs: number, dayEndMs: number): DashboardFocusSource {
    const db = getDB();
    const row = db.getFirstSync<FocusSummaryRow>(
      `SELECT COUNT(*) AS completed_sessions,
              COALESCE(SUM(actual_duration_sec), 0) AS total_seconds
       FROM focus_sessions
       WHERE completed = 1 AND cancelled = 0
         AND started_at >= ? AND started_at < ?`,
      [dayStartMs, dayEndMs]
    );

    return {
      completedSessions: row?.completed_sessions ?? 0,
      totalSeconds: row?.total_seconds ?? 0,
    };
  },

  getMemorySummary(dayStartMs: number, dayEndMs: number): DashboardMemorySource {
    const db = getDB();
    const row = db.getFirstSync<MemorySummaryRow>(
      `SELECT COUNT(*) AS review_count,
              COUNT(DISTINCT f.deck_id) AS decks_reviewed,
              COALESCE(SUM(CASE WHEN r.rating = 'again' THEN 1 ELSE 0 END), 0) AS again_count,
              COALESCE(SUM(CASE WHEN r.rating = 'hard' THEN 1 ELSE 0 END), 0) AS hard_count
       FROM flashcard_reviews r
       INNER JOIN flashcards f ON f.id = r.card_id
       WHERE r.reviewed_at >= ? AND r.reviewed_at < ?`,
      [dayStartMs, dayEndMs]
    );

    return {
      reviewCount: row?.review_count ?? 0,
      decksReviewed: row?.decks_reviewed ?? 0,
      againCount: row?.again_count ?? 0,
      hardCount: row?.hard_count ?? 0,
    };
  },

  getWeakDeck(windowStartMs: number, windowEndMs: number): DashboardWeakDeckSource | null {
    const db = getDB();
    const row = db.getFirstSync<WeakDeckRow>(
      `SELECT d.id AS deck_id, d.name AS deck_name,
              COUNT(*) AS attention_count,
              MAX(r.reviewed_at) AS last_attention_at
       FROM flashcard_reviews r
       INNER JOIN flashcards f ON f.id = r.card_id
       INNER JOIN decks d ON d.id = f.deck_id
       WHERE r.rating IN ('again', 'hard')
         AND r.reviewed_at >= ? AND r.reviewed_at < ?
       GROUP BY d.id, d.name
       ORDER BY attention_count DESC, last_attention_at DESC,
                d.name COLLATE NOCASE ASC, d.id ASC
       LIMIT 1`,
      [windowStartMs, windowEndMs]
    );

    return row
      ? {
          deckId: row.deck_id,
          deckName: row.deck_name,
          attentionCount: row.attention_count,
          lastAttentionAt: row.last_attention_at,
        }
      : null;
  },
};
