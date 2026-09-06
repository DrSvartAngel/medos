import {
  formatLocalDateKey,
  formatLocalTime,
  localTimeToMinutes,
} from './calendarDate';
import type { ManualEventSource } from '@/db/repositories/calendarRepo';
import type {
  CommitteeTimelineSource,
  FocusTimelineSource,
  MemoryReviewTimelineSource,
} from '@/db/repositories/timelineRepo';
import type { CalendarItem } from '@/store/useCalendarStore';

interface BuildTimelineInput {
  manualEvents: ManualEventSource[];
  committeeDates: CommitteeTimelineSource[];
  focusSessions: FocusTimelineSource[];
  memoryReviews: MemoryReviewTimelineSource[];
  startDate: string;
  endDateExclusive: string;
}

function isInRange(date: string, startDate: string, endDateExclusive: string): boolean {
  return date >= startDate && date < endDateExclusive;
}

function formatFocusDuration(seconds: number): string {
  if (seconds < 60) return '<1 min focused';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min focused`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0
    ? `${hours} ${hours === 1 ? 'hour' : 'hours'} focused`
    : `${hours}h ${minutes}m focused`;
}

const TYPE_PRIORITY: Record<CalendarItem['type'], number> = {
  committee_exam: 0,
  committee_start: 1,
  manual: 2,
  focus: 3,
  memory: 4,
};

export function buildCalendarItems(input: BuildTimelineInput): CalendarItem[] {
  const items: CalendarItem[] = input.manualEvents.map(({ event, committeeName }) => {
    const committeeLabel = event.committeeId
      ? committeeName ?? 'Committee removed'
      : undefined;
    const subtitle = [committeeLabel, event.description || undefined]
      .filter((value): value is string => value !== undefined)
      .join(' · ');

    return {
      id: `manual:${event.id}`,
      type: 'manual',
      display: { name: committeeName, description: event.description },
      date: event.date,
      title: event.title,
      subtitle: subtitle || undefined,
      time: event.startTime ?? undefined,
      committeeId: event.committeeId,
      sourceId: event.id,
      editable: true,
      sortMinutes: event.startTime ? localTimeToMinutes(event.startTime) : null,
    };
  });

  for (const committee of input.committeeDates) {
    const startDate = formatLocalDateKey(committee.startDate);
    if (committee.startDate > 0 && isInRange(startDate, input.startDate, input.endDateExclusive)) {
      items.push({
        id: `committee_start:${committee.id}`,
        type: 'committee_start',
        display: { name: committee.name },
        date: startDate,
        title: `${committee.name} starts`,
        subtitle: 'Committee start',
        committeeId: committee.id,
        sourceId: committee.id,
        editable: false,
        sortMinutes: null,
      });
    }

    const examDate = formatLocalDateKey(committee.examDate);
    if (committee.examDate > 0 && isInRange(examDate, input.startDate, input.endDateExclusive)) {
      items.push({
        id: `committee_exam:${committee.id}`,
        type: 'committee_exam',
        display: { name: committee.name },
        date: examDate,
        title: `${committee.name} Exam`,
        subtitle: 'Exam date',
        committeeId: committee.id,
        sourceId: committee.id,
        editable: false,
        sortMinutes: null,
      });
    }
  }

  for (const session of input.focusSessions) {
    const date = formatLocalDateKey(session.startedAt);
    const committeeLabel = session.committeeId
      ? session.committeeName ?? 'Committee removed'
      : null;
    items.push({
      id: `focus:${session.id}`,
      type: 'focus',
      display: { name: session.committeeName, actualSec: session.actualSec },
      date,
      title: session.committeeName ? `${session.committeeName} Focus` : 'Focus session',
      subtitle: [committeeLabel, formatFocusDuration(session.actualSec)]
        .filter((value): value is string => value !== null)
        .join(' · '),
      time: formatLocalTime(session.startedAt),
      committeeId: session.committeeId,
      sourceId: session.id,
      editable: false,
      sortMinutes:
        new Date(session.startedAt).getHours() * 60 + new Date(session.startedAt).getMinutes(),
    });
  }

  const memoryGroups = new Map<
    string,
    { deckId: string; deckName: string; date: string; count: number; earliestAt: number }
  >();
  for (const review of input.memoryReviews) {
    const date = formatLocalDateKey(review.reviewedAt);
    const key = `${date}:${review.deckId}`;
    const existing = memoryGroups.get(key);
    if (existing) {
      existing.count += 1;
      existing.earliestAt = Math.min(existing.earliestAt, review.reviewedAt);
    } else {
      memoryGroups.set(key, {
        deckId: review.deckId,
        deckName: review.deckName,
        date,
        count: 1,
        earliestAt: review.reviewedAt,
      });
    }
  }

  for (const group of memoryGroups.values()) {
    const earliest = new Date(group.earliestAt);
    items.push({
      id: `memory:${group.deckId}:${group.date}`,
      type: 'memory',
      display: { name: group.deckName, reviews: group.count },
      date: group.date,
      title: `${group.deckName} review`,
      subtitle: `${group.count} card ${group.count === 1 ? 'review' : 'reviews'}`,
      committeeId: null,
      sourceId: group.deckId,
      editable: false,
      sortMinutes: earliest.getHours() * 60 + earliest.getMinutes(),
    });
  }

  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aMinutes = a.sortMinutes ?? -1;
    const bMinutes = b.sortMinutes ?? -1;
    if (aMinutes !== bMinutes) return aMinutes - bMinutes;
    const priority = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    return priority !== 0 ? priority : a.id.localeCompare(b.id);
  });
}
