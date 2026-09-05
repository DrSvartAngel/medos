import { create } from 'zustand';
import { todayLocalDateKey } from '@/utils/calendarDate';
import {
  getAdaptiveRecommendation,
  isAdaptiveDurationSec,
  isCheckInAttention,
  isCheckInEnergy,
  isCheckInFresh,
  type AdaptiveDurationSec,
  type CheckInAttention,
  type CheckInEnergy,
} from '@/utils/studySupportRules';

interface StudySupportState {
  energy: CheckInEnergy | null;
  attention: CheckInAttention | null;
  capturedAt: number | null;
  localDateKey: string | null;
  selectedDurationSec: AdaptiveDurationSec | null;
  committeeId: string | null;
  committeeName: string | null;
  contextError: string | null;

  setEnergy: (energy: CheckInEnergy, now?: number) => void;
  setAttention: (attention: CheckInAttention, now?: number) => void;
  selectDuration: (durationSec: AdaptiveDurationSec) => void;
  setCommitteeContext: (committeeId: string, committeeName: string) => void;
  clearCommitteeContext: () => void;
  setContextError: (message: string | null) => void;
  clearIfExpired: (now?: number) => boolean;
  resetCheckIn: () => void;
}

const emptyState = {
  energy: null,
  attention: null,
  capturedAt: null,
  localDateKey: null,
  selectedDurationSec: null,
  committeeId: null,
  committeeName: null,
  contextError: null,
} as const;

function captureStart(
  capturedAt: number | null,
  localDateKey: string | null,
  now: number
): { capturedAt: number; localDateKey: string } {
  if (capturedAt !== null && localDateKey !== null) {
    return { capturedAt, localDateKey };
  }
  return { capturedAt: now, localDateKey: todayLocalDateKey(new Date(now)) };
}

export const useStudySupportStore = create<StudySupportState>()((set, get) => ({
  ...emptyState,

  setEnergy: (energy, now = Date.now()) => {
    const state = get();
    const capture = captureStart(state.capturedAt, state.localDateKey, now);
    const recommendation = getAdaptiveRecommendation(energy, state.attention);
    set({
      energy,
      ...capture,
      selectedDurationSec: recommendation?.durationSec ?? null,
    });
  },

  setAttention: (attention, now = Date.now()) => {
    const state = get();
    const capture = captureStart(state.capturedAt, state.localDateKey, now);
    const recommendation = getAdaptiveRecommendation(state.energy, attention);
    set({
      attention,
      ...capture,
      selectedDurationSec: recommendation?.durationSec ?? null,
    });
  },

  selectDuration: (durationSec) => {
    const state = get();
    if (
      getAdaptiveRecommendation(state.energy, state.attention) === null ||
      !isAdaptiveDurationSec(durationSec)
    ) {
      return;
    }
    set({ selectedDurationSec: durationSec });
  },

  setCommitteeContext: (committeeId, committeeName) => {
    const normalizedId = committeeId.trim();
    const normalizedName = committeeName.trim();
    if (!normalizedId || !normalizedName) {
      set({ committeeId: null, committeeName: null });
      return;
    }
    set({
      committeeId: normalizedId,
      committeeName: normalizedName,
      contextError: null,
    });
  },

  clearCommitteeContext: () => {
    set({ committeeId: null, committeeName: null, contextError: null });
  },

  setContextError: (message) => {
    set({ contextError: message });
  },

  clearIfExpired: (now = Date.now()) => {
    const state = get();
    const hasAnswers =
      state.energy !== null ||
      state.attention !== null ||
      state.capturedAt !== null ||
      state.localDateKey !== null ||
      state.selectedDurationSec !== null;
    if (!hasAnswers) return false;

    const malformed =
      !isCheckInEnergy(state.energy) ||
      (state.attention !== null && !isCheckInAttention(state.attention)) ||
      (state.attention !== null && state.selectedDurationSec === null) ||
      (state.attention === null && state.selectedDurationSec !== null) ||
      (state.selectedDurationSec !== null &&
        !isAdaptiveDurationSec(state.selectedDurationSec));
    const expired = !isCheckInFresh(
      { capturedAt: state.capturedAt, localDateKey: state.localDateKey },
      now
    );

    if (!malformed && !expired) return false;
    set({ ...emptyState });
    return true;
  },

  resetCheckIn: () => {
    set({ ...emptyState });
  },
}));
