import { getDB } from '../client';
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
  SELECT id, deck_id, front, back, created_at, updated_at
  FROM flashcards`;

const REVIEW_HISTORY_SELECT = `
  SELECT r.id, r.card_id, r.rating, r.reviewed_at,
         d.id AS deck_id, d.name AS deck_name, f.front AS card_front
  FROM flashcard_reviews r
  INNER JOIN flashcards f ON f.id = r.card_id
  INNER JOIN decks d ON d.id = f.deck_id`;

export const memoryRepo = {
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
    // Legacy scheduler fields are compatibility-only and are not used by Phase 2.3.
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
    db.runSync(
      `INSERT INTO flashcard_reviews (id, card_id, rating, reviewed_at)
       VALUES (?, ?, ?, ?)`,
      [review.id, review.cardId, review.rating, review.reviewedAt]
    );
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
