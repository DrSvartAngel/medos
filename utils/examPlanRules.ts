import { differenceInLocalCalendarDays, formatLocalDateKey, isValidLocalDateKey, shiftLocalDateKey } from './calendarDate';

export interface ExamPlanTopic { id: string; name: string; subjectName: string }
export type ExamPlan =
  | { status: 'invalid_date' | 'exam_today' | 'exam_past' | 'no_topics' }
  | { status: 'ready'; today: string; examDate: string; studyDays: number; totalTopics: number;
      days: { date: string; topics: ExamPlanTopic[] }[]; unassignedDays: number };

/** All local days from today inclusive to the exam exclusive; input order is authoritative. */
export function buildExamPlan(examTimestamp: unknown, topics: readonly ExamPlanTopic[], now = Date.now()): ExamPlan {
  if (typeof examTimestamp !== 'number' || !Number.isFinite(examTimestamp)) return { status: 'invalid_date' };
  let today: string, examDate: string;
  try {
    today = formatLocalDateKey(now); examDate = formatLocalDateKey(examTimestamp);
    if (!isValidLocalDateKey(today) || !isValidLocalDateKey(examDate)) return { status: 'invalid_date' };
  } catch { return { status: 'invalid_date' }; }
  const studyDays = differenceInLocalCalendarDays(today, examDate);
  if (studyDays === 0) return { status: 'exam_today' };
  if (studyDays < 0) return { status: 'exam_past' };
  if (!topics.length) return { status: 'no_topics' };
  const base = Math.floor(topics.length / studyDays), extra = topics.length % studyDays;
  const days: Extract<ExamPlan, { status: 'ready' }>['days'] = [];
  let offset = 0;
  // No allocation for potentially years of empty days; these are reported explicitly.
  for (let day = 0; day < Math.min(studyDays, topics.length); day++) {
    const count = base + (day < extra ? 1 : 0);
    days.push({ date: shiftLocalDateKey(today, day), topics: topics.slice(offset, offset + count) });
    offset += count;
  }
  return { status: 'ready', today, examDate, studyDays, totalTopics: topics.length, days,
    unassignedDays: studyDays - days.length };
}
