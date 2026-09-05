import { create } from 'zustand';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { focusRepo } from '@/db/repositories/focusRepo';
import { useAppStore } from '@/store/useAppStore';
import { normalizeFocusDurationSec } from '@/utils/preferences';
import {
  isStandardAdaptiveDurationSec,
  type AdaptiveDurationSec,
} from '@/utils/studySupportRules';

export { DEFAULT_FOCUS_SEC } from '@/utils/preferences';
export const MIN_CANCEL_PERSIST_SEC = 30;
export const ENTRY_FOCUS_SEC = 2 * 60;

export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime';
export type FocusSessionMode = 'standard' | 'entry';

export interface StartEntrySessionOptions {
  committeeId?: string | null;
}

export interface StartAdaptiveSessionOptions {
  durationSec: Exclude<AdaptiveDurationSec, 120>;
  committeeId?: string | null;
}

export interface FocusSession {
  id: string;
  /** Chosen session length in seconds. */
  plannedSec: number;
  /** Real elapsed focus time in seconds. */
  actualSec: number;
  completed: boolean;
  cancelled: boolean;
  committeeId: string | null;
  /** Original session start, Unix milliseconds. */
  startedAt: number;
  /** Session conclusion, Unix milliseconds. */
  endedAt: number | null;
}

interface ElapsedState {
  timerStatus: TimerStatus;
  runningSince: number | null;
  accumulatedSec: number;
}

interface FocusState extends ElapsedState {
  plannedSec: number;
  /** Runtime-only UI mode. Focus history intentionally does not persist it. */
  sessionMode: FocusSessionMode;
  /** Prevents the two-minute milestone from returning after Keep Going. */
  entryMilestoneDismissed: boolean;
  /** Prevents repeated accessibility announcements during the same entry session. */
  entryMilestoneAnnounced: boolean;
  /** Original session start; preserved across pause/resume. */
  startedAt: number | null;
  /** Most recent pause time, Unix milliseconds. */
  pausedAt: number | null;
  /** Start of the current unpaused segment, Unix milliseconds. */
  runningSince: number | null;
  /** Runtime-only start of an explicit Gentle Return break. */
  gentleBreakStartedAt: number | null;
  selectedCommitteeId: string | null;

  recentSessions: FocusSession[];
  isLoadingHistory: boolean;
  error: string | null;

  setPlannedSec: (sec: number) => void;
  setSelectedCommittee: (id: string | null) => void;
  startTimer: () => void;
  startEntrySession: (options?: StartEntrySessionOptions) => boolean;
  startAdaptiveSession: (options: StartAdaptiveSessionOptions) => boolean;
  pauseTimer: () => void;
  startGentleBreak: () => boolean;
  clearGentleBreak: () => void;
  resumeTimer: () => void;
  markOvertime: () => void;
  keepGoingFromEntry: () => boolean;
  continueEntryToDefault: () => boolean;
  markEntryMilestoneAnnounced: () => void;
  finishSession: () => void;
  cancelSession: () => void;
  resetTimer: () => void;
  loadRecentSessions: () => void;
  setError: (error: string | null) => void;
}

function createEmptyTimer() {
  return {
    timerStatus: 'idle' as const,
    plannedSec: useAppStore.getState().defaultFocusSec,
    sessionMode: 'standard' as const,
    entryMilestoneDismissed: false,
    entryMilestoneAnnounced: false,
    startedAt: null,
    pausedAt: null,
    runningSince: null,
    gentleBreakStartedAt: null,
    accumulatedSec: 0,
    selectedCommitteeId: null,
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Derives real elapsed time without relying on interval frequency. */
export function getElapsedSec(state: ElapsedState, now = Date.now()): number {
  const currentSegmentSec =
    state.runningSince === null || state.timerStatus === 'paused' || state.timerStatus === 'idle'
      ? 0
      : Math.max(0, now - state.runningSince) / 1000;

  return Math.max(0, state.accumulatedSec + currentSegmentSec);
}

export function isEntryMilestoneVisible(
  sessionMode: FocusSessionMode,
  dismissed: boolean,
  elapsedSec: number
): boolean {
  return sessionMode === 'entry' && !dismissed && elapsedSec >= ENTRY_FOCUS_SEC;
}

function resolveSessionCommitteeId(committeeId?: string | null): string | null {
  if (!committeeId) return null;

  try {
    return committeeRepo.getById(committeeId)?.id ?? null;
  } catch {
    // Starting small should remain available if optional context became stale.
    return null;
  }
}

function buildSession(state: FocusState, endedAt: number, cancelled: boolean): FocusSession | null {
  if (state.startedAt === null) return null;

  return {
    id: generateId(),
    plannedSec: state.plannedSec,
    actualSec: Math.floor(getElapsedSec(state, endedAt)),
    completed: !cancelled,
    cancelled,
    committeeId: state.selectedCommitteeId,
    startedAt: state.startedAt,
    endedAt,
  };
}

export const useFocusStore = create<FocusState>()((set, get) => ({
  ...createEmptyTimer(),
  recentSessions: [],
  isLoadingHistory: false,
  error: null,

  setPlannedSec: (sec) => {
    if (get().timerStatus !== 'idle') return;
    set({
      plannedSec: Math.max(60, Math.floor(sec)),
      sessionMode: 'standard',
      entryMilestoneDismissed: false,
      entryMilestoneAnnounced: false,
      error: null,
    });
  },

  setSelectedCommittee: (id) => {
    if (get().timerStatus !== 'idle') return;
    set({ selectedCommitteeId: id, error: null });
  },

  startTimer: () => {
    if (get().timerStatus !== 'idle') return;
    const now = Date.now();
    set({
      timerStatus: 'running',
      startedAt: now,
      runningSince: now,
      pausedAt: null,
      gentleBreakStartedAt: null,
      accumulatedSec: 0,
      sessionMode: 'standard',
      entryMilestoneDismissed: false,
      entryMilestoneAnnounced: false,
      error: null,
    });
  },

  startEntrySession: (options = {}) => {
    if (get().timerStatus !== 'idle') return false;

    const now = Date.now();
    set({
      timerStatus: 'running',
      plannedSec: ENTRY_FOCUS_SEC,
      sessionMode: 'entry',
      entryMilestoneDismissed: false,
      entryMilestoneAnnounced: false,
      startedAt: now,
      runningSince: now,
      pausedAt: null,
      gentleBreakStartedAt: null,
      accumulatedSec: 0,
      selectedCommitteeId: resolveSessionCommitteeId(options.committeeId),
      error: null,
    });
    return true;
  },

  startAdaptiveSession: ({ durationSec, committeeId = null }) => {
    if (
      get().timerStatus !== 'idle' ||
      !isStandardAdaptiveDurationSec(durationSec)
    ) {
      return false;
    }

    const now = Date.now();
    set({
      timerStatus: 'running',
      plannedSec: durationSec,
      sessionMode: 'standard',
      entryMilestoneDismissed: false,
      entryMilestoneAnnounced: false,
      startedAt: now,
      runningSince: now,
      pausedAt: null,
      gentleBreakStartedAt: null,
      accumulatedSec: 0,
      selectedCommitteeId: resolveSessionCommitteeId(committeeId),
      error: null,
    });
    return true;
  },

  pauseTimer: () => {
    const state = get();
    if (
      (state.timerStatus !== 'running' && state.timerStatus !== 'overtime') ||
      state.runningSince === null
    ) {
      return;
    }

    const now = Date.now();
    set({
      timerStatus: 'paused',
      accumulatedSec: getElapsedSec(state, now),
      runningSince: null,
      pausedAt: now,
      gentleBreakStartedAt: null,
      error: null,
    });
  },

  startGentleBreak: () => {
    const state = get();
    if (
      (state.timerStatus !== 'running' && state.timerStatus !== 'overtime') ||
      state.runningSince === null ||
      state.gentleBreakStartedAt !== null
    ) {
      return false;
    }

    const now = Date.now();
    set({
      timerStatus: 'paused',
      accumulatedSec: getElapsedSec(state, now),
      runningSince: null,
      pausedAt: now,
      gentleBreakStartedAt: now,
      error: null,
    });
    return true;
  },

  clearGentleBreak: () => {
    if (get().gentleBreakStartedAt === null) return;
    set({ gentleBreakStartedAt: null });
  },

  resumeTimer: () => {
    const state = get();
    if (state.timerStatus !== 'paused') return;

    set({
      timerStatus: state.accumulatedSec >= state.plannedSec ? 'overtime' : 'running',
      runningSince: Date.now(),
      pausedAt: null,
      gentleBreakStartedAt: null,
      error: null,
    });
  },

  markOvertime: () => {
    const state = get();
    if (state.timerStatus === 'running' && getElapsedSec(state) >= state.plannedSec) {
      set({ timerStatus: 'overtime' });
    }
  },

  keepGoingFromEntry: () => {
    const state = get();
    if (
      state.timerStatus === 'idle' ||
      state.sessionMode !== 'entry' ||
      state.entryMilestoneDismissed ||
      getElapsedSec(state) < ENTRY_FOCUS_SEC
    ) {
      return false;
    }

    set({
      timerStatus: state.timerStatus === 'paused' ? 'paused' : 'overtime',
      entryMilestoneDismissed: true,
      error: null,
    });
    return true;
  },

  continueEntryToDefault: () => {
    const state = get();
    if (
      state.timerStatus === 'idle' ||
      state.sessionMode !== 'entry' ||
      getElapsedSec(state) < ENTRY_FOCUS_SEC
    ) {
      return false;
    }

    const plannedSec = normalizeFocusDurationSec(
      useAppStore.getState().defaultFocusSec
    );
    const elapsedSec = getElapsedSec(state);
    const timerStatus =
      state.timerStatus === 'paused'
        ? 'paused'
        : elapsedSec >= plannedSec
          ? 'overtime'
          : 'running';

    set({
      plannedSec,
      timerStatus,
      sessionMode: 'standard',
      entryMilestoneDismissed: false,
      error: null,
    });
    return true;
  },

  markEntryMilestoneAnnounced: () => {
    const state = get();
    if (
      state.sessionMode === 'entry' &&
      !state.entryMilestoneDismissed &&
      !state.entryMilestoneAnnounced &&
      getElapsedSec(state) >= ENTRY_FOCUS_SEC
    ) {
      set({ entryMilestoneAnnounced: true });
    }
  },

  finishSession: () => {
    const state = get();
    if (state.timerStatus === 'idle') return;

    const session = buildSession(state, Date.now(), false);
    if (session === null) {
      set({ error: 'This focus session could not be completed.' });
      return;
    }

    try {
      focusRepo.insert(session);
    } catch (error) {
      set({ error: (error as Error).message ?? 'Failed to save focus session' });
      return;
    }

    // The session is already durable. Reset before refreshing so a history-read
    // failure cannot cause a retry to insert the same completed session twice.
    set({ ...createEmptyTimer(), error: null });
    get().loadRecentSessions();
  },

  cancelSession: () => {
    const state = get();
    if (state.timerStatus === 'idle') return;

    const session = buildSession(state, Date.now(), true);
    if (session === null) {
      set({ error: 'This focus session could not be cancelled.' });
      return;
    }

    // False starts are deliberately discarded and never written to SQLite.
    if (session.actualSec < MIN_CANCEL_PERSIST_SEC) {
      set({ ...createEmptyTimer(), error: null });
      return;
    }

    try {
      focusRepo.insert(session);
    } catch (error) {
      set({ error: (error as Error).message ?? 'Failed to cancel focus session' });
      return;
    }


    set({ ...createEmptyTimer(), error: null });
    get().loadRecentSessions();
  },

  resetTimer: () => {
    if (get().timerStatus !== 'idle') return;
    set({ ...createEmptyTimer(), error: null });
  },

  loadRecentSessions: () => {
    set({ isLoadingHistory: true, error: null });
    try {
      const recentSessions = focusRepo.getRecent(10);
      set({ recentSessions, isLoadingHistory: false });
    } catch (error) {
      set({
        isLoadingHistory: false,
        error: (error as Error).message ?? 'Failed to load focus history',
      });
    }
  },

  setError: (error) => set({ error }),
}));
