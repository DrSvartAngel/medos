import { create } from 'zustand';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import {
  getCommitteeDateStatus,
  type CommitteeDateStatus,
} from '@/utils/committeeDate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CommitteeStatus = CommitteeDateStatus;

export interface Committee {
  id: string;
  name: string;
  description: string;
  /** Hex color string for card accent, e.g. '#6C63FF' */
  color: string;
  /** Unix milliseconds */
  startDate: number;
  /** Unix milliseconds */
  examDate: number;
  status: CommitteeStatus;
  /** Unix milliseconds */
  createdAt: number;
  /** Unix milliseconds */
  updatedAt: number;
}

export interface CreateCommitteeInput {
  name: string;
  description: string;
  startDate: number;
  examDate: number;
  color: string;
}

export interface UpdateCommitteeInput {
  name?: string;
  description?: string;
  startDate?: number;
  examDate?: number;
  color?: string;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------
interface CommitteeState {
  committees: Committee[];
  isLoading: boolean;
  error: string | null;
  isLoadingCommittee: boolean;
  committeeRequestId: string | null;
  committeeLoadError: string | null;
  committeeNotFound: boolean;

  /** Loads all committees from SQLite into the store. */
  loadCommittees: () => boolean;
  /** Loads one committee directly from SQLite for fresh/deep-linked routes. */
  loadCommittee: (id: string) => Committee | null;
  /** Creates a new committee, persists to SQLite, and updates state. */
  addCommittee: (input: CreateCommitteeInput) => boolean;
  /** Updates an existing committee, persists to SQLite, and updates state. */
  updateCommittee: (id: string, input: UpdateCommitteeInput) => boolean;
  /** Deletes a committee from SQLite and removes it from state. */
  deleteCommittee: (id: string) => boolean;
  setError: (error: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateId(): string {
  // Simple collision-resistant ID using timestamp + random component.
  // No external dependency required.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sortByExamDate(committees: Committee[]): Committee[] {
  return [...committees].sort((a, b) => a.examDate - b.examDate);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useCommitteeStore = create<CommitteeState>()((set, get) => ({
  committees: [],
  isLoading: false,
  error: null,
  isLoadingCommittee: false,
  committeeRequestId: null,
  committeeLoadError: null,
  committeeNotFound: false,

  loadCommittees: () => {
    set({ isLoading: true, error: null });
    try {
      const committees = committeeRepo.getAll();
      set({ committees, isLoading: false });
      return true;
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message ?? 'Failed to load committees' });
      return false;
    }
  },

  loadCommittee: (id) => {
    set({
      isLoadingCommittee: true,
      committeeRequestId: id,
      committeeLoadError: null,
      committeeNotFound: false,
    });
    try {
      const committee = committeeRepo.getById(id);
      if (!committee) {
        set({ isLoadingCommittee: false, committeeNotFound: true });
        return null;
      }

      set((state) => ({
        committees: sortByExamDate([
          ...state.committees.filter((item) => item.id !== committee.id),
          committee,
        ]),
        isLoadingCommittee: false,
        committeeLoadError: null,
        committeeNotFound: false,
      }));
      return committee;
    } catch (e) {
      set({
        isLoadingCommittee: false,
        committeeLoadError: (e as Error).message ?? 'Failed to load committee',
        committeeNotFound: false,
      });
      return null;
    }
  },

  addCommittee: (input) => {
    set({ error: null });
    const now = Date.now();
    const committee: Committee = {
      id: generateId(),
      name: input.name.trim(),
      description: input.description.trim(),
      color: input.color,
      startDate: input.startDate,
      examDate: input.examDate,
      status: getCommitteeDateStatus(input.startDate, input.examDate),
      createdAt: now,
      updatedAt: now,
    };
    try {
      committeeRepo.insert(committee);
      set((state) => ({
        committees: sortByExamDate([...state.committees, committee]),
        error: null,
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message ?? 'Failed to create committee' });
      return false;
    }
  },

  updateCommittee: (id, input) => {
    set({ error: null });
    let existing = get().committees.find((c) => c.id === id);

    try {
      existing ??= committeeRepo.getById(id) ?? undefined;
    } catch (e) {
      set({ error: (e as Error).message ?? 'Failed to load committee for update' });
      return false;
    }

    if (!existing) {
      set({ error: 'This committee could not be found.' });
      return false;
    }

    const startDate = input.startDate ?? existing.startDate;
    const examDate  = input.examDate  ?? existing.examDate;
    const updated: Committee = {
      ...existing,
      ...input,
      startDate,
      examDate,
      name:        (input.name        ?? existing.name).trim(),
      description: (input.description ?? existing.description).trim(),
      status:      getCommitteeDateStatus(startDate, examDate),
      updatedAt:   Date.now(),
    };

    try {
      if (!committeeRepo.update(updated)) {
        set({ error: 'This committee could not be found.' });
        return false;
      }
      set((state) => ({
        committees: sortByExamDate([
          ...state.committees.filter((committee) => committee.id !== id),
          updated,
        ]),
        error: null,
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message ?? 'Failed to update committee' });
      return false;
    }
  },

  deleteCommittee: (id) => {
    set({ error: null });
    try {
      if (!committeeRepo.delete(id)) {
        set({ error: 'This committee could not be found.' });
        return false;
      }
      set((state) => ({
        committees: state.committees.filter((c) => c.id !== id),
        error: null,
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message ?? 'Failed to delete committee' });
      return false;
    }
  },

  setError: (error) => set({ error }),
}));
