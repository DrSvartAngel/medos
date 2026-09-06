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
  topic_id: string | null;
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
    topicId: row.topic_id ?? null,
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
  SELECT id, deck_id, topic_id, front, back, created_at, updated_at, schedule_state, next_review,
         EXISTS(SELECT 1 FROM flashcard_reviews r WHERE r.card_id = flashcards.id) AS has_reviews
  FROM flashcards`;

const REVIEW_HISTORY_SELECT = `
  SELECT r.id, r.card_id, r.rating, r.reviewed_at,
         d.id AS deck_id, d.name AS deck_name, f.front AS card_front
  FROM flashcard_reviews r
  INNER JOIN flashcards f ON f.id = r.card_id
  INNER JOIN decks d ON d.id = f.deck_id`;

function checkedTopicId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('memory_topic_unavailable');
  if (!getDB().getFirstSync('SELECT id FROM topics WHERE id = ?', [value])) throw new Error('memory_topic_unavailable');
  return value;
}

export const memoryRepo = {
  // Card counts describe current links; review counts describe rating-time snapshots.
  getTopicLearningEvidence(topicId: string, now = Date.now()): {
    linkedCards: number; linkedReviews: number; dueCards: number; nextReviewAt: number | null;
  } {
    if (typeof topicId !== 'string' || !topicId.trim() || !Number.isSafeInteger(now) || now < 0) throw new Error('Evidence unavailable');
    const row = getDB().getFirstSync<{linkedCards:number;linkedReviews:number;dueCards:number;nextReviewAt:number|null}>(
      `SELECT
       (SELECT COUNT(*) FROM flashcards WHERE topic_id=t.id) AS linkedCards,
       (SELECT COUNT(*) FROM flashcard_reviews WHERE topic_id=t.id) AS linkedReviews,
       (SELECT COUNT(*) FROM flashcards WHERE topic_id=t.id AND schedule_state != 'unscheduled' AND next_review <= ?) AS dueCards,
       (SELECT MIN(next_review) FROM flashcards WHERE topic_id=t.id AND schedule_state != 'unscheduled' AND next_review > ?) AS nextReviewAt
       FROM topics t WHERE t.id = ?`, [now,now,topicId]);
    if (!row) throw new Error('Evidence unavailable');
    return row;
  },
  getTopicLinkContext(topicId: string): { topic: string; subject: string; committee: string } | null {
    return getDB().getFirstSync<{topic:string;subject:string;committee:string}>(
      `SELECT t.name AS topic, s.name AS subject, c.name AS committee FROM topics t
       JOIN subjects s ON s.id=t.subject_id JOIN committees c ON c.id=s.committee_id WHERE t.id=?`, [topicId]);
  },

  // Only one hierarchy level/page is loaded. No global curriculum cache.
  listTopicLinkChoices(level: 'committee' | 'subject' | 'topic', parentId: string | null, offset = 0): {id:string;name:string}[] {
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid page');
    if (level === 'committee') return getDB().getAllSync('SELECT id,name FROM committees ORDER BY created_at ASC,id ASC LIMIT ? OFFSET ?', [51,offset]);
    if (!parentId || typeof parentId !== 'string') throw new Error('Parent unavailable');
    if (level === 'subject') return getDB().getAllSync('SELECT id,name FROM subjects WHERE committee_id=? ORDER BY created_at ASC,id ASC LIMIT ? OFFSET ?', [parentId,51,offset]);
    if (level === 'topic') return getDB().getAllSync('SELECT id,name FROM topics WHERE subject_id=? ORDER BY created_at ASC,id ASC LIMIT ? OFFSET ?', [parentId,51,offset]);
    throw new Error('Invalid hierarchy level');
  },

  hasTopicReviewActivity(topicId: string): boolean {
    if (typeof topicId !== 'string' || !topicId.trim()) throw new Error('Topic unavailable');
    const row = getDB().getFirstSync<{recorded:number}>(
      'SELECT EXISTS(SELECT 1 FROM flashcard_reviews WHERE topic_id = ?) AS recorded', [topicId]);
    if (!row) throw new Error('Review evidence unavailable');
    return row.recorded === 1;
  },
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
    const topicId = checkedTopicId(card.topicId);
    // These values remain inert until schedule_state changes from unscheduled.
    db.runSync(
      `INSERT INTO flashcards
         (id, deck_id, front, back, interval, ease, next_review, created_at, updated_at, topic_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        topicId,
      ]
    );
  },

  updateCard(card: Flashcard): void {
    const db = getDB();
    const existing = this.getCardById(card.id);
    if (!existing || existing.deckId !== card.deckId) throw new Error('Card unavailable');
    const topicId = checkedTopicId(card.topicId === undefined ? existing.topicId : card.topicId);
    const result = db.runSync(
      `UPDATE flashcards
       SET front = ?, back = ?, updated_at = ?, topic_id = ?
       WHERE id = ? AND deck_id = ?`,
      [card.front, card.back, card.updatedAt, topicId, card.id, card.deckId]
    );
    if (result.changes !== 1) throw new Error('Card was not saved');
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
      const card = db.getFirstSync<{schedule_state:ScheduleState;interval:number;topic_id:string|null}>(
        'SELECT schedule_state, interval, topic_id FROM flashcards WHERE id = ?', [review.cardId]);
      if (!card) throw new Error('Card unavailable');
      const next = scheduleReview({state:card.schedule_state,intervalDays:card.interval},review.rating,review.reviewedAt);
      db.runSync(
        `INSERT INTO flashcard_reviews (id, card_id, rating, reviewed_at, topic_id)
         VALUES (?, ?, ?, ?, ?)`,
        [review.id, review.cardId, review.rating, review.reviewedAt, card.topic_id ?? null]
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
