import {
  differenceInLocalCalendarDays,
  formatLocalDateKey,
} from '@/utils/calendarDate';

export type CommitteeDateStatus = 'upcoming' | 'active' | 'completed';

export function getCommitteeDateStatus(
  startDate: number,
  examDate: number,
  now = Date.now()
): CommitteeDateStatus {
  const todayKey = formatLocalDateKey(now);
  const startKey = formatLocalDateKey(startDate);
  const examKey = formatLocalDateKey(examDate);

  if (todayKey > examKey) return 'completed';
  if (todayKey >= startKey) return 'active';
  return 'upcoming';
}

export function getCommitteeDaysToExam(examDate: number, now = Date.now()): number {
  return differenceInLocalCalendarDays(
    formatLocalDateKey(now),
    formatLocalDateKey(examDate)
  );
}

export function getCommitteeCountdownLabel(
  startDate: number,
  examDate: number,
  now = Date.now()
): string {
  const status = getCommitteeDateStatus(startDate, examDate, now);
  const daysToExam = getCommitteeDaysToExam(examDate, now);

  if (daysToExam === 0) return 'Exam today';

  if (status === 'completed') {
    const daysSinceExam = Math.abs(daysToExam);
    return `${daysSinceExam} ${daysSinceExam === 1 ? 'day' : 'days'} since exam`;
  }

  return `${daysToExam} ${daysToExam === 1 ? 'day' : 'days'} until exam`;
}
