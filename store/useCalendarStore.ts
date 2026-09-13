import { create } from 'zustand';
import { calendarRepo } from '@/db/repositories/calendarRepo';
import { timelineRepo } from '@/db/repositories/timelineRepo';
import {
  getVisibleGridRange,
  isValidLocalDateKey,
  monthStartKey,
  shiftMonth,
  todayLocalDateKey,
  type LocalDateKey,
} from '@/utils/calendarDate';
import { buildCalendarItems } from '@/utils/calendarTimeline';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: LocalDateKey;
  startTime: string | null;
  endTime: string | null;
  committeeId: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEventInput {
  title: string;
  description: string;
  date: LocalDateKey;
  startTime: string | null;
  endTime: string | null;
  committeeId: string | null;
  subjectId?: string | null;
  topicId?: string | null;
}

export type CalendarItemType =
  | 'manual'
  | 'committee_start'
  | 'committee_exam'
  | 'focus'
  | 'memory';

export interface CalendarItem {
  // Raw presentation inputs only; not persisted. Keep user content separate from generated copy.
  display?: { name?: string | null; description?: string; actualSec?: number; reviews?: number };
  id: string;
  type: CalendarItemType;
  date: LocalDateKey;
  title: string;
  subtitle?: string;
  time?: string;
  committeeId: string | null;
  sourceId: string;
  editable: boolean;
  sortMinutes: number | null;
}

interface CalendarState {
  selectedDate: LocalDateKey;
  visibleMonth: LocalDateKey;
  manualEvents: CalendarEvent[];
  timelineItems: CalendarItem[];
  activeEvent: CalendarEvent | null;
  isLoading: boolean;
  isLoadingEvent: boolean;
  error: string | null;

  selectDate: (date: LocalDateKey) => void;
  setVisibleMonth: (month: LocalDateKey) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  loadVisibleRange: () => void;
  refreshTimeline: () => void;
  loadEvent: (id: string) => void;
  createEvent: (input: CalendarEventInput) => string | null;
  updateEvent: (id: string, input: CalendarEventInput) => boolean;
  deleteEvent: (id: string) => boolean;
  clearActiveEvent: () => void;
  setError: (error: string | null) => void;
}

const initialToday = todayLocalDateKey();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  selectedDate: initialToday,
  visibleMonth: monthStartKey(initialToday),
  manualEvents: [],
  timelineItems: [],
  activeEvent: null,
  isLoading: false,
  isLoadingEvent: false,
  error: null,

  selectDate: (date) => {
    if (!isValidLocalDateKey(date)) {
      set({ error: 'That date is not valid.' });
      return;
    }
    const nextMonth = monthStartKey(date);
    if (nextMonth !== get().visibleMonth) {
      set({ selectedDate: date, visibleMonth: nextMonth, error: null });
      get().loadVisibleRange();
    } else {
      set({ selectedDate: date, error: null });
    }
  },

  setVisibleMonth: (month) => {
    if (!isValidLocalDateKey(month)) {
      set({ error: 'That month is not valid.' });
      return;
    }
    const normalizedMonth = monthStartKey(month);
    set({ visibleMonth: normalizedMonth, selectedDate: normalizedMonth, error: null });
    get().loadVisibleRange();
  },

  goToPreviousMonth: () => {
    get().setVisibleMonth(shiftMonth(get().visibleMonth, -1));
  },

  goToNextMonth: () => {
    get().setVisibleMonth(shiftMonth(get().visibleMonth, 1));
  },

  goToToday: () => {
    const today = todayLocalDateKey();
    set({ selectedDate: today, visibleMonth: monthStartKey(today), error: null });
    get().loadVisibleRange();
  },

  loadVisibleRange: () => {
    set({ isLoading: true, error: null });
    try {
      const range = getVisibleGridRange(get().visibleMonth);
      const manualSources = calendarRepo.getByDateRange(
        range.startDate,
        range.endDateExclusive
      );
      const committeeDates = timelineRepo.getCommitteeDatesByRange(
        range.startMs,
        range.endMs
      );
      const focusSessions = timelineRepo.getCompletedFocusByRange(
        range.startMs,
        range.endMs
      );
      const memoryReviews = timelineRepo.getMemoryReviewsByRange(
        range.startMs,
        range.endMs
      );

      set({
        manualEvents: manualSources.map((source) => source.event),
        timelineItems: buildCalendarItems({
          manualEvents: manualSources,
          committeeDates,
          focusSessions,
          memoryReviews,
          startDate: range.startDate,
          endDateExclusive: range.endDateExclusive,
        }),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: errorMessage(error, 'Could not load this calendar range.'),
      });
    }
  },

  refreshTimeline: () => get().loadVisibleRange(),

  loadEvent: (id) => {
    set({ isLoadingEvent: true, error: null });
    try {
      set({ activeEvent: calendarRepo.getById(id), isLoadingEvent: false });
    } catch (error) {
      set({
        activeEvent: null,
        isLoadingEvent: false,
        error: errorMessage(error, 'Could not load this study event.'),
      });
    }
  },

  createEvent: (input) => {
    const now = Date.now();
    const event: CalendarEvent = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description.trim(),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      committeeId: input.committeeId,
      subjectId: input.subjectId ?? null,
      topicId: input.topicId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      calendarRepo.insert(event);
      set({
        activeEvent: event,
        selectedDate: event.date,
        visibleMonth: monthStartKey(event.date),
        error: null,
      });
      get().loadVisibleRange();
      return event.id;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not create this study event.') });
      return null;
    }
  },

  updateEvent: (id, input) => {
    let existing = get().activeEvent?.id === id ? get().activeEvent : null;
    try {
      existing ??= calendarRepo.getById(id);
    } catch (error) {
      set({ error: errorMessage(error, 'Could not load this study event.') });
      return false;
    }
    if (!existing) {
      set({ error: 'This study event no longer exists.' });
      return false;
    }

    const updated: CalendarEvent = {
      ...existing,
      title: input.title.trim(),
      description: input.description.trim(),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      committeeId: input.committeeId,
      subjectId: input.subjectId ?? null,
      topicId: input.topicId ?? null,
      updatedAt: Date.now(),
    };

    try {
      calendarRepo.update(updated);
      set({
        activeEvent: updated,
        selectedDate: updated.date,
        visibleMonth: monthStartKey(updated.date),
        error: null,
      });
      get().loadVisibleRange();
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not update this study event.') });
      return false;
    }
  },

  deleteEvent: (id) => {
    try {
      calendarRepo.delete(id);
      set((state) => ({
        activeEvent: state.activeEvent?.id === id ? null : state.activeEvent,
        manualEvents: state.manualEvents.filter((event) => event.id !== id),
        timelineItems: state.timelineItems.filter(
          (item) => !(item.type === 'manual' && item.sourceId === id)
        ),
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Could not delete this study event.') });
      return false;
    }
  },

  clearActiveEvent: () => set({ activeEvent: null, isLoadingEvent: false }),

  setError: (error) => set({ error }),
}));
