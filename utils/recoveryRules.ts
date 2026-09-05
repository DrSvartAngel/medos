import type { CalendarEvent } from '@/store/useCalendarStore';
import {
  getLocalDayRange,
  localDateTimeToTimestamp,
  localTimeToMinutes,
  type LocalDateKey,
} from './calendarDate';

export const RECOVERY_REVIEW_LIMIT = 5;
export const RECOVERY_ACTION_LIMIT = 3;

export interface RecoveryCommitteeContext {
  id: string;
  name: string;
}

export type RecoveryMemorySelectionReason =
  | 'recent_again_hard'
  | 'recently_updated';

export interface RecoveryMemoryCandidate {
  deckId: string;
  deckName: string;
  availableCardCount: number;
  selectionReason: RecoveryMemorySelectionReason;
}

export type RecoveryCalendarTimingKind = 'ongoing' | 'all_day' | 'future';

export interface RecoveryCalendarCandidate {
  eventId: string;
  title: string;
  timingKind: RecoveryCalendarTimingKind;
  displayedTime: string | null;
}

export type RecoveryAction =
  | {
      type: 'focus';
      committee: RecoveryCommitteeContext | null;
    }
  | ({ type: 'memory' } & RecoveryMemoryCandidate)
  | ({ type: 'calendar' } & RecoveryCalendarCandidate);

interface CalendarCandidateWithSort extends RecoveryCalendarCandidate {
  sortRank: number;
  sortMinutes: number;
}

function classifyCalendarEvent(
  event: CalendarEvent,
  today: LocalDateKey,
  now: number
): CalendarCandidateWithSort | null {
  if (event.date !== today) return null;

  if (event.startTime === null) {
    return {
      eventId: event.id,
      title: event.title,
      timingKind: 'all_day',
      displayedTime: null,
      sortRank: 1,
      sortMinutes: -1,
    };
  }

  const startMinutes = localTimeToMinutes(event.startTime);
  if (startMinutes === null) return null;

  const nowDate = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const endMinutes = event.endTime === null
    ? null
    : localTimeToMinutes(event.endTime);
  const ongoing =
    endMinutes !== null &&
    endMinutes > startMinutes &&
    startMinutes <= nowMinutes &&
    endMinutes > nowMinutes;

  if (ongoing) {
    return {
      eventId: event.id,
      title: event.title,
      timingKind: 'ongoing',
      displayedTime: event.startTime,
      sortRank: 0,
      sortMinutes: startMinutes,
    };
  }

  // A timed event without an end is no longer actionable once its start time arrives.
  if (startMinutes <= nowMinutes) return null;

  return {
    eventId: event.id,
    title: event.title,
    timingKind: 'future',
    displayedTime: event.startTime,
    sortRank: 2,
    sortMinutes: startMinutes,
  };
}

export function selectRecoveryCalendarCandidate(
  events: readonly CalendarEvent[],
  today: LocalDateKey,
  now: number
): RecoveryCalendarCandidate | null {
  const candidates = events
    .map((event) => classifyCalendarEvent(event, today, now))
    .filter((candidate): candidate is CalendarCandidateWithSort => candidate !== null)
    .sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      if (a.sortMinutes !== b.sortMinutes) return a.sortMinutes - b.sortMinutes;
      return a.eventId.localeCompare(b.eventId);
    });

  const candidate = candidates[0];
  if (!candidate) return null;
  const { sortRank: _sortRank, sortMinutes: _sortMinutes, ...action } = candidate;
  return action;
}

export function getNextRecoveryCalendarRefreshAt(
  events: readonly CalendarEvent[],
  today: LocalDateKey,
  now: number
): number {
  const boundaries = [getLocalDayRange(today).endMs];

  for (const event of events) {
    if (event.date !== today || event.startTime === null) continue;

    const startAt = localDateTimeToTimestamp(today, event.startTime);
    if (startAt !== null && startAt > now) boundaries.push(startAt);

    if (event.endTime !== null) {
      const endAt = localDateTimeToTimestamp(today, event.endTime);
      if (endAt !== null && startAt !== null && endAt > startAt && endAt > now) {
        boundaries.push(endAt);
      }
    }
  }

  return Math.min(...boundaries.filter((boundary) => boundary > now));
}

export function buildIdleRecoveryActions(input: {
  committee: RecoveryCommitteeContext | null;
  memory: RecoveryMemoryCandidate | null;
  calendar: RecoveryCalendarCandidate | null;
}): RecoveryAction[] {
  const actions: RecoveryAction[] = [
    { type: 'focus', committee: input.committee },
  ];

  if (input.memory !== null) {
    actions.push({ type: 'memory', ...input.memory });
  }
  if (input.calendar !== null) {
    actions.push({ type: 'calendar', ...input.calendar });
  }

  return actions.slice(0, RECOVERY_ACTION_LIMIT);
}
