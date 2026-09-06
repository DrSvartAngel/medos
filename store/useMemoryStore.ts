import { create } from 'zustand';
import { memoryRepo } from '@/db/repositories/memoryRepo';

export interface Deck {
  id: string;
  name: string;
  description: string;
  committeeId: string | null;
  cardCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Flashcard {
  id: string;
  topicId?: string | null;
  deckId: string;
  front: string;
  back: string;
  createdAt: number;
  updatedAt: number;
  schedule?: { state: 'new' | 'unscheduled' | 'learning' | 'reviewing'; nextReviewAt: number | null };
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type ReviewStatus = 'idle' | 'loading' | 'question' | 'answer' | 'complete';

export interface ReviewRecord {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: number;
}

export interface ReviewHistoryItem extends ReviewRecord {
  deckId: string;
  deckName: string;
  cardFront: string;
}

export interface ReviewSummaryData {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface CreateDeckInput {
  name: string;
  description: string;
  committeeId: string | null;
}

export type UpdateDeckInput = CreateDeckInput;

export interface CreateCardInput {
  topicId?: string | null;
  deckId: string;
  front: string;
  back: string;
}

export interface UpdateCardInput {
  topicId?: string | null;
  front: string;
  back: string;
}

interface MemoryState {
  decks: Deck[];
  cards: Flashcard[];
  recentReviews: ReviewHistoryItem[];
  isLoadingDecks: boolean;
  isLoadingCards: boolean;
  deckLoadError: string | null;
  reviewLoadError: string | null;
  error: string | null;

  reviewStatus: ReviewStatus;
  reviewDeckId: string | null;
  reviewQueue: Flashcard[];
  reviewIndex: number;
  reviewSummary: ReviewSummaryData;

  loadDecks: () => void;
  createDeck: (input: CreateDeckInput) => string | null;
  updateDeck: (id: string, input: UpdateDeckInput) => boolean;
  deleteDeck: (id: string) => boolean;
  loadCards: (deckId: string) => void;
  createCard: (input: CreateCardInput) => string | null;
  updateCard: (id: string, input: UpdateCardInput) => boolean;
  deleteCard: (id: string) => boolean;
  loadRecentReviews: (limit?: number) => void;
  startReview: (deckId: string, limit?: number, queueMode?: 'all' | 'due') => void;
  revealAnswer: () => void;
  rateCurrentCard: (rating: ReviewRating) => boolean;
  exitReview: () => void;
  setError: (error: string | null) => void;
}

const EMPTY_SUMMARY: ReviewSummaryData = {
  reviewed: 0,
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export const useMemoryStore = create<MemoryState>()((set, get) => ({
  decks: [],
  cards: [],
  recentReviews: [],
  isLoadingDecks: false,
  isLoadingCards: false,
  deckLoadError: null,
  reviewLoadError: null,
  error: null,

  reviewStatus: 'idle',
  reviewDeckId: null,
  reviewQueue: [],
  reviewIndex: 0,
  reviewSummary: { ...EMPTY_SUMMARY },

  loadDecks: () => {
    set({ isLoadingDecks: true, deckLoadError: null });
    try {
      set({
        decks: memoryRepo.getAllDecks(),
        isLoadingDecks: false,
        deckLoadError: null,
      });
    } catch (error) {
      set({
        isLoadingDecks: false,
        deckLoadError: errorMessage(error, 'Could not load your decks.'),
      });
    }
  },

  createDeck: (input) => {
    const now = Date.now();
    const deck: Deck = {
      id: generateId(),
      name: input.name.trim(),
      description: input.description.trim(),
      committeeId: input.committeeId,
      cardCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      memoryRepo.insertDeck(deck);
      set((state) => ({ decks: [deck, ...state.decks], error: null }));
      return deck.id;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not create this deck.') });
      return null;
    }
  },

  updateDeck: (id, input) => {
    let existing = get().decks.find((deck) => deck.id === id);
    try {
      existing ??= memoryRepo.getDeckById(id) ?? undefined;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not load this deck.') });
      return false;
    }
    if (!existing) {
      set({ error: 'This deck no longer exists.' });
      return false;
    }

    const updated: Deck = {
      ...existing,
      name: input.name.trim(),
      description: input.description.trim(),
      committeeId: input.committeeId,
      updatedAt: Date.now(),
    };

    try {
      memoryRepo.updateDeck(updated);
      set((state) => ({
        decks: state.decks.map((deck) => (deck.id === id ? updated : deck)),
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not update this deck.') });
      return false;
    }
  },

  deleteDeck: (id) => {
    try {
      memoryRepo.deleteDeck(id);
      set((state) => ({
        decks: state.decks.filter((deck) => deck.id !== id),
        cards: state.cards.filter((card) => card.deckId !== id),
        recentReviews: state.recentReviews.filter((review) => review.deckId !== id),
        error: null,
        ...(state.reviewDeckId === id
          ? {
              reviewStatus: 'idle' as const,
              reviewDeckId: null,
              reviewQueue: [],
              reviewIndex: 0,
              reviewSummary: { ...EMPTY_SUMMARY },
            }
          : {}),
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not delete this deck.') });
      return false;
    }
  },

  loadCards: (deckId) => {
    set({ isLoadingCards: true, error: null });
    try {
      set({ cards: memoryRepo.getCardsByDeck(deckId), isLoadingCards: false });
    } catch (error) {
      set({
        isLoadingCards: false,
        error: errorMessage(error, 'Could not load the cards in this deck.'),
      });
    }
  },

  createCard: (input) => {
    const now = Date.now();
    const card: Flashcard = {
      id: generateId(),
      deckId: input.deckId,
      topicId: input.topicId ?? null,
      front: input.front.trim(),
      back: input.back.trim(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      memoryRepo.insertCard(card);
      set((state) => ({
        cards: [...state.cards, card],
        decks: state.decks.map((deck) =>
          deck.id === input.deckId
            ? { ...deck, cardCount: deck.cardCount + 1 }
            : deck
        ),
        error: null,
      }));
      return card.id;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not create this card.') });
      return null;
    }
  },

  updateCard: (id, input) => {
    let existing = get().cards.find((card) => card.id === id);
    try {
      existing ??= memoryRepo.getCardById(id) ?? undefined;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not load this card.') });
      return false;
    }
    if (!existing) {
      set({ error: 'This card no longer exists.' });
      return false;
    }

    const updated: Flashcard = {
      ...existing,
      topicId: input.topicId === undefined ? existing.topicId : input.topicId,
      front: input.front.trim(),
      back: input.back.trim(),
      updatedAt: Date.now(),
    };

    try {
      memoryRepo.updateCard(updated);
      set((state) => ({
        cards: state.cards.map((card) => (card.id === id ? updated : card)),
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not update this card.') });
      return false;
    }
  },

  deleteCard: (id) => {
    let existing = get().cards.find((card) => card.id === id);
    try {
      existing ??= memoryRepo.getCardById(id) ?? undefined;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not load this card.') });
      return false;
    }
    if (!existing) {
      set({ error: 'This card no longer exists.' });
      return false;
    }

    try {
      memoryRepo.deleteCard(id);
      set((state) => ({
        cards: state.cards.filter((card) => card.id !== id),
        decks: state.decks.map((deck) =>
          deck.id === existing.deckId
            ? { ...deck, cardCount: Math.max(0, deck.cardCount - 1) }
            : deck
        ),
        recentReviews: state.recentReviews.filter((review) => review.cardId !== id),
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not delete this card.') });
      return false;
    }
  },

  loadRecentReviews: (limit = 10) => {
    set({ reviewLoadError: null });
    try {
      set({ recentReviews: memoryRepo.getRecentReviews(limit), reviewLoadError: null });
    } catch (error) {
      set({ reviewLoadError: errorMessage(error, 'Could not load recent review history.') });
    }
  },

  startReview: (deckId, limit, queueMode = 'all') => {
    set({
      reviewStatus: 'loading',
      reviewDeckId: deckId,
      reviewQueue: [],
      reviewIndex: 0,
      reviewSummary: { ...EMPTY_SUMMARY },
      error: null,
    });

    try {
      const deck = memoryRepo.getDeckById(deckId);
      if (deck === null) {
        set({
          reviewStatus: 'idle',
          reviewDeckId: null,
          error: 'This deck is no longer available.',
        });
        return;
      }

      const reviewQueue = queueMode === 'due' ? memoryRepo.getDueReviewQueue(deckId) : memoryRepo.getReviewQueue(deckId, limit);
      set({
        reviewQueue,
        reviewStatus: reviewQueue.length === 0 ? 'complete' : 'question',
      });
    } catch (error) {
      set({
        reviewStatus: 'idle',
        error: errorMessage(error, 'Could not start this review.'),
      });
    }
  },

  revealAnswer: () => {
    if (get().reviewStatus === 'question') {
      set({ reviewStatus: 'answer', error: null });
    }
  },

  rateCurrentCard: (rating) => {
    const state = get();
    if (state.reviewStatus !== 'answer') return false;

    const card = state.reviewQueue[state.reviewIndex];
    if (!card) {
      set({ error: 'The current card is unavailable.' });
      return false;
    }

    try {
      // A stale card must not produce an orphan review record.
      if (!memoryRepo.getCardById(card.id)) {
        set({ error: 'This card was deleted. Leave and restart the review.' });
        return false;
      }
    } catch (error) {
      set({ error: errorMessage(error, 'Could not verify the current card.') });
      return false;
    }

    const review: ReviewRecord = {
      id: generateId(),
      cardId: card.id,
      rating,
      reviewedAt: Date.now(),
    };

    try {
      memoryRepo.insertReview(review);
    } catch (error) {
      // Keep the answer visible so the same rating can be retried safely.
      set({ error: errorMessage(error, 'Could not save this review. Please try again.') });
      return false;
    }

    // Advance only after the review row is durable in SQLite.
    const nextIndex = state.reviewIndex + 1;
    set({
      reviewIndex: nextIndex,
      reviewStatus: nextIndex >= state.reviewQueue.length ? 'complete' : 'question',
      reviewSummary: {
        ...state.reviewSummary,
        reviewed: state.reviewSummary.reviewed + 1,
        [rating]: state.reviewSummary[rating] + 1,
      },
      error: null,
    });
    get().loadRecentReviews(10);
    return true;
  },

  exitReview: () => {
    set({
      reviewStatus: 'idle',
      reviewDeckId: null,
      reviewQueue: [],
      reviewIndex: 0,
      reviewSummary: { ...EMPTY_SUMMARY },
      error: null,
    });
  },

  setError: (error) => set({ error }),
}));
