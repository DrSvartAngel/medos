import { create } from 'zustand';
import { calendarRepo } from '@/db/repositories/calendarRepo';
import { dashboardRepo } from '@/db/repositories/dashboardRepo';
import { timelineRepo } from '@/db/repositories/timelineRepo';
import { todayLocalDateKey } from '@/utils/calendarDate';
import {
  buildQuickStart,
  buildTodayAgenda,
  getDashboardDayWindow,
  normalizeDashboardCommittee,
  type DashboardCommittee,
  type DashboardFocusSummary,
  type DashboardMemorySummary,
  type DashboardSnapshot,
  type DashboardWeakDeck,
} from '@/utils/dashboardRules';

export type DashboardSection =
  | 'committee'
  | 'focus'
  | 'memory'
  | 'agenda'
  | 'recommendation';

export type DashboardSectionErrors = Partial<Record<DashboardSection, string>>;

interface DashboardState {
  snapshot: DashboardSnapshot | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  sectionErrors: DashboardSectionErrors;
  lastLoadedAt: number | null;
  refresh: () => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  snapshot: null,
  isInitialLoading: false,
  isRefreshing: false,
  sectionErrors: {},
  lastLoadedAt: null,

  refresh: () => {
    const hasSnapshot = get().snapshot !== null;
    set({
      isInitialLoading: !hasSnapshot,
      isRefreshing: hasSnapshot,
      sectionErrors: {},
    });

    const now = Date.now();
    const today = todayLocalDateKey(new Date(now));
    const window = getDashboardDayWindow(today);
    const errors: DashboardSectionErrors = {};

    let committee: DashboardCommittee | null = null;
    try {
      committee = normalizeDashboardCommittee(
        dashboardRepo.getRelevantCommittee(window.dayStartMs, window.dayEndMs),
        today
      );
    } catch (error) {
      errors.committee = errorMessage(error, 'Committee summary is unavailable.');
    }

    let focus: DashboardFocusSummary | null = null;
    try {
      focus = dashboardRepo.getFocusSummary(window.dayStartMs, window.dayEndMs);
    } catch (error) {
      errors.focus = errorMessage(error, 'Focus summary is unavailable.');
    }

    let memory: DashboardMemorySummary | null = null;
    try {
      memory = dashboardRepo.getMemorySummary(window.dayStartMs, window.dayEndMs);
    } catch (error) {
      errors.memory = errorMessage(error, 'Memory summary is unavailable.');
    }

    let weakDeck: DashboardWeakDeck | null = null;
    try {
      weakDeck = dashboardRepo.getWeakDeck(window.attentionStartMs, window.dayEndMs);
    } catch (error) {
      errors.recommendation = errorMessage(error, 'Memory recommendation is unavailable.');
    }

    let manualEvents: ReturnType<typeof calendarRepo.getByDateRange> = [];
    let committeeDates: ReturnType<typeof timelineRepo.getCommitteeDatesByRange> = [];
    try {
      manualEvents = calendarRepo.getByDateRange(today, window.nextDate);
    } catch (error) {
      errors.agenda = errorMessage(error, 'Some planned items are unavailable.');
    }
    try {
      committeeDates = timelineRepo.getCommitteeDatesByRange(
        window.dayStartMs,
        window.dayEndMs
      );
    } catch (error) {
      errors.agenda ??= errorMessage(error, 'Some planned items are unavailable.');
    }

    const agenda = buildTodayAgenda(manualEvents, committeeDates, today, now);
    const snapshot: DashboardSnapshot = {
      date: today,
      generatedAt: now,
      committee,
      focus,
      memory,
      weakDeck,
      agenda: agenda.items,
      agendaTotal: agenda.total,
      quickStart: buildQuickStart(agenda.manualCandidate, committee, weakDeck),
    };

    set({
      snapshot,
      isInitialLoading: false,
      isRefreshing: false,
      sectionErrors: errors,
      lastLoadedAt: now,
    });
  },
}));
