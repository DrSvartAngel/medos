import { create } from 'zustand';
import { qbankRepo } from '@/db/repositories/qbankRepo';
import type { QBankSession, CreateQBankSessionInput } from '@/models/qbank';

interface QBankState {
  recentSessions: QBankSession[];
  isLoading: boolean;
  error: string | null;

  loadRecentSessions: (limit?: number) => void;
  addSession: (input: CreateQBankSessionInput) => QBankSession | null;
  deleteSession: (id: string) => boolean;
  clearError: () => void;
}

export const useQBankStore = create<QBankState>()((set, get) => ({
  recentSessions: [],
  isLoading: false,
  error: null,

  loadRecentSessions: (limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const recentSessions = qbankRepo.getRecent(limit);
      set({ recentSessions, isLoading: false, error: null });
    } catch (e) {
      set({
        isLoading: false,
        error: (e as Error).message ?? 'Failed to load Q-Bank sessions',
      });
    }
  },

  addSession: (input) => {
    set({ error: null });
    try {
      const session = qbankRepo.insert(input);
      set((state) => ({
        recentSessions: [
          session,
          ...state.recentSessions.filter((s) => s.id !== session.id),
        ].sort((a, b) => b.createdAt - a.createdAt),
        error: null,
      }));
      return session;
    } catch (e) {
      set({ error: (e as Error).message ?? 'Failed to save Q-Bank session' });
      return null;
    }
  },

  deleteSession: (id) => {
    set({ error: null });
    try {
      const success = qbankRepo.delete(id);
      if (!success) {
        set({ error: 'This Q-Bank session could not be found.' });
        return false;
      }
      set((state) => ({
        recentSessions: state.recentSessions.filter((s) => s.id !== id),
        error: null,
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message ?? 'Failed to delete Q-Bank session' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
