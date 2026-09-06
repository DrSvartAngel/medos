import { getDB } from '../client';
import { scheduleReview, type ScheduleState } from '@/utils/memoryScheduling';
import type {
  Deck,
  Flashcard,
  ReviewHistoryItem,
  ReviewRecord,
} from '@/store/useMemoryStore';

interface DeckRow {
  id: string;
  name: string;
  description: string | null;
  committee_id: string | null;
  created_at: number;
  updated_at: number;
  card_count: number;
}

interface FlashcardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  created_at: number;
  updated_at: number;
  schedule_state: ScheduleState;
  next_review: number;
  has_reviews: number;
}

interface ReviewHistoryRow {
  id: string;
  card_id: string;
  rating: ReviewRecord['rating'];
  reviewed_at: number;
  deck_id: string;
  deck_name: string;
  card_front: string;
}

interface CountRow {
  count: number;
}

function rowToDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    committeeId: row.committee_id,
    cardCount: row.card_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    schedule: { state: row.schedule_state === 'unscheduled' ? (row.has_reviews ? 'unscheduled' : 'new') : row.schedule_state,
      nextReviewAt: row.schedule_state === 'unscheduled' ? null : row.next_review },
  };
}

function rowToReviewHistory(row: ReviewHistoryRow): ReviewHistoryItem {
  return {
    id: row.id,
    cardId: row.card_id,
    rating: row.rating,
    reviewedAt: row.reviewed_at,
    deckId: row.deck_id,
    deckName: row.deck_name,
    cardFront: row.card_front,
  };
}

const DECK_SELECT = `
  SELECT d.id, d.name, d.description, d.committee_id, d.created_at, d.updated_at,
         (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id) AS card_count
  FROM decks d`;

const CARD_SELECT = `
  SELECT id, deck_id, front, back, created_at, updated_at, schedule_state, next_review,
         EXISTS(SELECT 1 FROM flashcard_reviews r WHERE r.card_id = flashcards.id) AS has_reviews
  FROM flashcards`;

const REVIEW_HISTORY_SELECT = `
  SELECT r.id, r.card_id, r.rating, r.reviewed_at,
         d.id AS deck_id, d.name AS deck_name, f.front AS card_front
  FROM flashcard_reviews r
  INNER JOIN flashcards f ON f.id = r.card_id
  INNER JOIN decks d ON d.id = f.deck_id`;

export const memoryRepo = {
  getScheduleSummary(deckId: string, now = Date.now()): { due: number; newCards: number; unscheduled: number; nextReviewAt: number | null } {
    const row = getDB().getFirstSync<{due:number;newCards:number;unscheduled:number;nextReviewAt:number|null}>(
      `SELECT COALESCE(SUM(CASE WHEN schedule_state != 'unscheduled' AND next_review <= ? THEN 1 ELSE 0 END),0) AS due,
       COALESCE(SUM(CASE WHEN schedule_state = 'unscheduled' AND NOT EXISTS(SELECT 1 FROM flashcard_reviews r WHERE r.card_id=f.id) THEN 1 ELSE 0 END),0) AS newCards,
       COALESCE(SUM(CASE WHEN schedule_state = 'unscheduled' AND EXISTS(SELECT 1 FROM flashcard_reviews r WHERE r.card_id=f.id) THEN 1 ELSE 0 END),0) AS unscheduled,
       MIN(CASE WHEN schedule_state != 'unscheduled' AND next_review > ? THEN next_review END) AS nextReviewAt
       FROM flashcards f WHERE deck_id = ?`, [now,now,deckId]);
    if (!row) throw new Error('Schedule unavailable');
    return row;
  },

  getDueReviewQueue(deckId: string, now = Date.now()): Flashcard[] {
    return getDB().getAllSync<FlashcardRow>(`${CARD_SELECT}
      WHERE deck_id = ? AND (schedule_state = 'unscheduled' OR next_review <= ?)
      ORDER BY CASE WHEN schedule_state = 'unscheduled' THEN 1 ELSE 0 END,
        CASE WHEN schedule_state != 'unscheduled' THEN next_review END ASC, created_at ASC, id ASC`, [deckId,now]).map(rowToFlashcard);
  },
  getAllDecks(): Deck[] {
    const db = getDB();
    const rows = db.getAllSync<DeckRow>(`${DECK_SELECT} ORDER BY d.updated_at DESC, d.id ASC`);
    return rows.map(rowToDeck);
  },

  getMostRecentlyUpdatedNonEmptyDeck(): Deck | null {
    const db = getDB();
    const row = db.getFirstSync<DeckRow>(
      `${DECK_SELECT}
       WHERE EXISTS (SELECT 1 FROM flashcards f WHERE f.deck_id = d.id)
       ORDER BY d.updated_at DESC, d.id ASC
       LIMIT 1`
    );
    return row ? rowToDeck(row) : null;
  },

  getDeckById(id: string): Deck | null {
    const db = getDB();
    const row = db.getFirstSync<DeckRow>(`${DECK_SELECT} WHERE d.id = ?`, [id]);
    return row ? rowToDeck(row) : null;
  },

  insertDeck(deck: Deck): void {
    const db = getDB();
    db.runSync(
      `INSERT INTO decks
         (id, name, subject, description, committee_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        deck.id,
        deck.name,
        '',
        deck.description,
        deck.committeeId,
        deck.createdAt,
        deck.updatedAt,
      ]
    );
  },

  updateDeck(deck: Deck): void {
    const db = getDB();
    db.runSync(
      `UPDATE decks
       SET name = ?, description = ?, committee_id = ?, updated_at = ?
       WHERE id = ?`,
      [deck.name, deck.description, deck.committeeId, deck.updatedAt, deck.id]
    );
  },

  deleteDeck(id: string): void {
    const db = getDB();
    db.withTransactionSync(() => {
      db.runSync(
        `DELETE FROM flashcard_reviews
         WHERE card_id IN (SELECT id FROM flashcards WHERE deck_id = ?)`,
        [id]
      );
      db.runSync('DELETE FROM flashcards WHERE deck_id = ?', [id]);
      db.runSync('DELETE FROM decks WHERE id = ?', [id]);
    });
  },

  getCardsByDeck(deckId: string): Flashcard[] {
    const db = getDB();
    const rows = db.getAllSync<FlashcardRow>(
      `${CARD_SELECT} WHERE deck_id = ? ORDER BY created_at ASC, id ASC`,
      [deckId]
    );
    return rows.map(rowToFlashcard);
  },

  getCardById(id: string): Flashcard | null {
    const db = getDB();
    const row = db.getFirstSync<FlashcardRow>(`${CARD_SELECT} WHERE id = ?`, [id]);
    return row ? rowToFlashcard(row) : null;
  },

  insertCard(card: Flashcard): void {
    const db = getDB();
    // These values remain inert until schedule_state changes from unscheduled.
    db.runSync(
      `INSERT INTO flashcards
         (id, deck_id, front, back, interval, ease, next_review, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id,
        card.deckId,
        card.front,
        card.back,
        1,
        2.5,
        card.createdAt,
        card.createdAt,
        card.updatedAt,
      ]
    );
  },

  updateCard(card: Flashcard): void {
    const db = getDB();
    db.runSync(
      `UPDATE flashcards
       SET front = ?, back = ?, updated_at = ?
       WHERE id = ?`,
      [card.front, card.back, card.updatedAt, card.id]
    );
  },

  deleteCard(id: string): void {
    const db = getDB();
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM flashcard_reviews WHERE card_id = ?', [id]);
      db.runSync('DELETE FROM flashcards WHERE id = ?', [id]);
    });
  },

  getReviewQueue(deckId: string, limit?: number): Flashcard[] {
    if (limit === undefined) return this.getCardsByDeck(deckId);

    const db = getDB();
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.floor(limit))
      : 1;
    const rows = db.getAllSync<FlashcardRow>(
      `${CARD_SELECT}
       WHERE deck_id = ?
       ORDER BY created_at ASC, id ASC
       LIMIT ?`,
      [deckId, safeLimit]
    );
    return rows.map(rowToFlashcard);
  },

  insertReview(review: ReviewRecord): void {
    const db = getDB();
    db.withTransactionSync(() => {
      const card = db.getFirstSync<{schedule_state:ScheduleState;interval:number}>(
        'SELECT schedule_state, interval FROM flashcards WHERE id = ?', [review.cardId]);
      if (!card) throw new Error('Card unavailable');
      const next = scheduleReview({state:card.schedule_state,intervalDays:card.interval},review.rating,review.reviewedAt);
      db.runSync(
        `INSERT INTO flashcard_reviews (id, card_id, rating, reviewed_at)
         VALUES (?, ?, ?, ?)`,
        [review.id, review.cardId, review.rating, review.reviewedAt]
      );
      const updated = db.runSync('UPDATE flashcards SET schedule_state = ?, interval = ?, next_review = ? WHERE id = ?',
        [next.state,next.intervalDays,next.nextReviewAt,review.cardId]);
      if (updated.changes !== 1) throw new Error('Card schedule was not saved');
    });
  },

  getRecentReviews(limit = 10, deckId?: string): ReviewHistoryItem[] {
    const db = getDB();
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = deckId
      ? db.getAllSync<ReviewHistoryRow>(
          `${REVIEW_HISTORY_SELECT}
           WHERE d.id = ?
           ORDER BY r.reviewed_at DESC, r.id DESC
           LIMIT ?`,
          [deckId, safeLimit]
        )
      : db.getAllSync<ReviewHistoryRow>(
          `${REVIEW_HISTORY_SELECT}
           ORDER BY r.reviewed_at DESC, r.id DESC
           LIMIT ?`,
          [safeLimit]
        );
    return rows.map(rowToReviewHistory);
  },

  getReviewCount(deckId?: string): number {
    const db = getDB();
    const row = deckId
      ? db.getFirstSync<CountRow>(
          `SELECT COUNT(*) AS count
           FROM flashcard_reviews r
           INNER JOIN flashcards f ON f.id = r.card_id
           WHERE f.deck_id = ?`,
          [deckId]
        )
      : db.getFirstSync<CountRow>('SELECT COUNT(*) AS count FROM flashcard_reviews');
    return row?.count ?? 0;
  },
};
