import type { ManualEventSource } from '@/db/repositories/calendarRepo';
import type {
  DashboardCommitteeSource,
  DashboardFocusSource,
  DashboardMemorySource,
  DashboardQBankSource,
  DashboardWeakDeckSource,
} from '@/db/repositories/dashboardRepo';
import type { CommitteeTimelineSource } from '@/db/repositories/timelineRepo';
import {
  differenceInLocalCalendarDays,
  formatLocalDateKey,
  getLocalDayRange,
  localTimeToMinutes,
  shiftLocalDateKey,
  type LocalDateKey,
} from './calendarDate';

export type DashboardCommitteeStatus = 'active' | 'upcoming' | 'recently_completed';
export type DashboardAgendaItemType = 'manual' | 'committee_start' | 'committee_exam';

export interface DashboardCommittee {
  id: string;
  name: string;
  color: string;
  startDate: number;
  examDate: number;
  status: DashboardCommitteeStatus;
  daysToExam: number;
}

export type DashboardFocusSummary = DashboardFocusSource;
export type DashboardMemorySummary = DashboardMemorySource;
export type DashboardQBankSummary = DashboardQBankSource;
export type DashboardWeakDeck = DashboardWeakDeckSource;

export interface DashboardAgendaItem {
  id: string;
  type: DashboardAgendaItemType;
  title: string;
  subtitle?: string;
  // Raw presentation context; never translate user-authored names.
  committeeName?: string | null;
  time?: string;
  sourceId: string;
  committeeId: string | null;
  sortRank: number;
  sortMinutes: number | null;
}

export interface DashboardManualCandidate {
  eventId: string;
  title: string;
  time: string | null;
  committeeId: string | null;
  committeeName: string | null;
}

export type DashboardQuickStart =
  | {
      kind: 'continue_focus';
      title: string;
      detail: string;
    }
  | {
      kind: 'manual_focus';
      time: string | null;
      title: string;
      detail: string;
      committeeId: string | null;
    }
  | {
      kind: 'committee_focus';
      daysToExam: number;
      title: string;
      detail: string;
      committeeId: string;
    }
  | {
      kind: 'memory_review';
      attentionCount: number;
      title: string;
      detail: string;
      deckId: string;
    }
  | {
      kind: 'generic_focus';
      title: string;
      detail: string;
    };

export interface DashboardSnapshot {
  date: LocalDateKey;
  generatedAt: number;
  committee: DashboardCommittee | null;
  focus: DashboardFocusSummary | null;
  memory: DashboardMemorySummary | null;
  qbank: DashboardQBankSummary | null;
  weakDeck: DashboardWeakDeck | null;
  agenda: DashboardAgendaItem[];
  agendaTotal: number;
  quickStart: DashboardQuickStart;
}

export interface DashboardDayWindow {
  date: LocalDateKey;
  nextDate: LocalDateKey;
  dayStartMs: number;
  dayEndMs: number;
  attentionStartMs: number;
}

interface AgendaResult {
  items: DashboardAgendaItem[];
  total: number;
  manualCandidate: DashboardManualCandidate | null;
}

export function getDashboardDayWindow(date: LocalDateKey): DashboardDayWindow {
  const dayRange = getLocalDayRange(date);
  const nextDate = shiftLocalDateKey(date, 1);
  const attentionStartDate = shiftLocalDateKey(date, -6);
  return {
    date,
    nextDate,
    dayStartMs: dayRange.startMs,
    dayEndMs: dayRange.endMs,
    attentionStartMs: getLocalDayRange(attentionStartDate).startMs,
  };
}

export function normalizeDashboardCommittee(
  source: DashboardCommitteeSource | null,
  today: LocalDateKey
): DashboardCommittee | null {
  if (!source) return null;
  const startDate = formatLocalDateKey(source.startDate);
  const examDate = formatLocalDateKey(source.examDate);
  const status: DashboardCommitteeStatus =
    startDate <= today && examDate >= today
      ? 'active'
      : startDate > today
        ? 'upcoming'
        : 'recently_completed';

  return {
    ...source,
    status,
    daysToExam: differenceInLocalCalendarDays(today, examDate),
  };
}

export function buildTodayAgenda(
  manualEvents: ManualEventSource[],
  committeeDates: CommitteeTimelineSource[],
  today: LocalDateKey,
  now: number
): AgendaResult {
  const nowDate = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const items: DashboardAgendaItem[] = [];
  const manualCandidates: Array<{
    item: DashboardAgendaItem;
    source: ManualEventSource;
  }> = [];

  for (const source of manualEvents) {
    const { event, committeeName } = source;
    if (event.date !== today) continue;
    const startMinutes = event.startTime ? localTimeToMinutes(event.startTime) : null;
    const endMinutes = event.endTime ? localTimeToMinutes(event.endTime) : null;
    const ongoing =
      startMinutes !== null &&
      endMinutes !== null &&
      startMinutes <= nowMinutes &&
      endMinutes > nowMinutes;
    const future = startMinutes !== null && startMinutes >= nowMinutes;
    const allDay = startMinutes === null;
    if (!ongoing && !future && !allDay) continue;

    const sortRank = ongoing ? 1 : allDay ? 2 : 3;
    const committeeLabel = event.committeeId
      ? committeeName ?? 'Committee removed'
      : undefined;
    const item: DashboardAgendaItem = {
      id: `manual:${event.id}`,
      type: 'manual',
      title: event.title,
      subtitle: committeeLabel,
      committeeName,
      time: event.startTime ?? undefined,
      sourceId: event.id,
      committeeId: event.committeeId,
      sortRank,
      sortMinutes: startMinutes,
    };
    items.push(item);
    manualCandidates.push({ item, source });
  }

  for (const committee of committeeDates) {
    const startDate = formatLocalDateKey(committee.startDate);
    const examDate = formatLocalDateKey(committee.examDate);
    if (committee.examDate > 0 && examDate === today) {
      items.push({
        id: `committee_exam:${committee.id}`,
        type: 'committee_exam',
        title: `${committee.name} Exam`,
        subtitle: 'Exam today',
        committeeName: committee.name,
        sourceId: committee.id,
        committeeId: committee.id,
        sortRank: 0,
        sortMinutes: null,
      });
    }
    if (committee.startDate > 0 && startDate === today) {
      items.push({
        id: `committee_start:${committee.id}`,
        type: 'committee_start',
        title: `${committee.name} starts`,
        subtitle: 'Committee start',
        committeeName: committee.name,
        sourceId: committee.id,
        committeeId: committee.id,
        sortRank: 4,
        sortMinutes: null,
      });
    }
  }

  const compareItems = (a: DashboardAgendaItem, b: DashboardAgendaItem): number => {
    if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
    const aMinutes = a.sortMinutes ?? -1;
    const bMinutes = b.sortMinutes ?? -1;
    return aMinutes !== bMinutes ? aMinutes - bMinutes : a.id.localeCompare(b.id);
  };
  items.sort(compareItems);
  manualCandidates.sort((a, b) => compareItems(a.item, b.item));

  const candidate = manualCandidates[0];
  return {
    items: items.slice(0, 3),
    total: items.length,
    manualCandidate: candidate
      ? {
          eventId: candidate.source.event.id,
          title: candidate.source.event.title,
          time: candidate.source.event.startTime,
          committeeId:
            candidate.source.event.committeeId !== null &&
            candidate.source.committeeName !== null
              ? candidate.source.event.committeeId
              : null,
          committeeName: candidate.source.committeeName,
        }
      : null,
  };
}

export function buildQuickStart(
  manualCandidate: DashboardManualCandidate | null,
  committee: DashboardCommittee | null,
  weakDeck: DashboardWeakDeck | null
): DashboardQuickStart {
  if (manualCandidate) {
    const timing = manualCandidate.time ? `Today at ${manualCandidate.time}` : 'Planned for today';
    return {
      kind: 'manual_focus',
      time: manualCandidate.time,
      title: manualCandidate.title,
      detail: `${timing} · Start a focused 25-minute block`,
      committeeId: manualCandidate.committeeId,
    };
  }

  if (
    committee?.status === 'active' &&
    committee.daysToExam >= 0 &&
    committee.daysToExam <= 30
  ) {
    const examLabel =
      committee.daysToExam === 0
        ? 'Exam today'
        : committee.daysToExam === 1
          ? 'Exam in 1 day'
          : `Exam in ${committee.daysToExam} days`;
    return {
      kind: 'committee_focus',
      daysToExam: committee.daysToExam,
      title: committee.name,
      detail: `${examLabel} · Start a focused 25-minute block`,
      committeeId: committee.id,
    };
  }

  if (weakDeck) {
    return {
      kind: 'memory_review',
      attentionCount: weakDeck.attentionCount,
      title: weakDeck.deckName,
      detail: `${weakDeck.attentionCount} Again/Hard ${
        weakDeck.attentionCount === 1 ? 'response' : 'responses'
      } in the last 7 days`,
      deckId: weakDeck.deckId,
    };
  }

  return {
    kind: 'generic_focus',
    title: 'A simple Focus block',
    detail: 'Start with 25 minutes and decide the rest later',
  };
}

export function formatDashboardDuration(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? '<1 min' : '0 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

export function getDashboardGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
