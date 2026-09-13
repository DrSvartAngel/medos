import { getDB } from '../client';
import {
  formatLocalDateKey,
  formatLocalTime,
  getLocalDayRange,
  isValidLocalDateKey,
  localDateTimeToTimestamp,
} from '@/utils/calendarDate';
import type { CalendarEvent } from '@/store/useCalendarStore';

interface CalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: number;
  end_time: number;
  is_all_day: number;
  committee_id: string | null;
  subject_id: string | null;
  topic_id: string | null;
  created_at: number;
  updated_at: number;
}

interface CalendarEventWithCommitteeRow extends CalendarEventRow {
  committee_name: string | null;
}

export interface ManualEventSource {
  event: CalendarEvent;
  committeeName: string | null;
}

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  const date = isValidLocalDateKey(row.event_date)
    ? row.event_date
    : formatLocalDateKey(row.start_time);
  const isAllDay = row.is_all_day === 1;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    date,
    startTime: isAllDay ? null : formatLocalTime(row.start_time),
    endTime:
      isAllDay || row.end_time <= row.start_time ? null : formatLocalTime(row.end_time),
    committeeId: row.committee_id,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function eventTimestamps(event: CalendarEvent): {
  startTime: number;
  endTime: number;
  isAllDay: number;
} {
  if (event.startTime === null) {
    const range = getLocalDayRange(event.date);
    return { startTime: range.startMs, endTime: range.endMs, isAllDay: 1 };
  }

  const startTime = localDateTimeToTimestamp(event.date, event.startTime);
  const endTime = event.endTime
    ? localDateTimeToTimestamp(event.date, event.endTime)
    : startTime;
  if (startTime === null || endTime === null) {
    throw new Error('Invalid local event date or time');
  }

  return { startTime, endTime, isAllDay: 0 };
}

function resolveAcademicContext(event: CalendarEvent): {
  committeeId: string | null;
  subjectId: string | null;
  topicId: string | null;
} {
  const db = getDB();
  let committeeId = event.committeeId ?? null;
  let subjectId: string | null = null;
  let topicId: string | null = null;

  if (event.topicId) {
    const topicRow = db.getFirstSync<{ id: string; subject_id: string; committee_id: string }>(
      `SELECT t.id, s.id AS subject_id, c.id AS committee_id
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       JOIN committees c ON c.id = s.committee_id
       WHERE t.id = ?`,
      [event.topicId]
    );
    if (topicRow) {
      topicId = topicRow.id;
      subjectId = topicRow.subject_id;
      committeeId = topicRow.committee_id;
    }
  } else if (event.subjectId) {
    const subjectRow = db.getFirstSync<{ id: string; committee_id: string }>(
      `SELECT s.id, c.id AS committee_id
       FROM subjects s
       JOIN committees c ON c.id = s.committee_id
       WHERE s.id = ?`,
      [event.subjectId]
    );
    if (subjectRow) {
      subjectId = subjectRow.id;
      committeeId = subjectRow.committee_id;
    }
  }

  return { committeeId, subjectId, topicId };
}

const EVENT_SELECT = `
  SELECT id, title, description, event_date, start_time, end_time, is_all_day,
         committee_id, subject_id, topic_id, created_at, updated_at
  FROM calendar_events`;

export const calendarRepo = {
  getByDateRange(startDate: string, endDateExclusive: string): ManualEventSource[] {
    const db = getDB();
    const rows = db.getAllSync<CalendarEventWithCommitteeRow>(
      `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_time,
              e.is_all_day, e.committee_id, e.subject_id, e.topic_id, e.created_at, e.updated_at,
              c.name AS committee_name
       FROM calendar_events e
       LEFT JOIN committees c ON c.id = e.committee_id
       WHERE e.event_date >= ? AND e.event_date < ?
       ORDER BY e.event_date ASC, e.is_all_day DESC, e.start_time ASC, e.id ASC`,
      [startDate, endDateExclusive]
    );

    return rows.map((row) => ({
      event: rowToEvent(row),
      committeeName: row.committee_name,
    }));
  },

  getById(id: string): CalendarEvent | null {
    const db = getDB();
    const row = db.getFirstSync<CalendarEventRow>(`${EVENT_SELECT} WHERE id = ?`, [id]);
    return row ? rowToEvent(row) : null;
  },

  insert(event: CalendarEvent): void {
    const db = getDB();
    const timestamps = eventTimestamps(event);
    const context = resolveAcademicContext(event);
    db.runSync(
      `INSERT INTO calendar_events
         (id, title, description, event_date, start_time, end_time, is_all_day,
          color, committee_id, subject_id, topic_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.title,
        event.description,
        event.date,
        timestamps.startTime,
        timestamps.endTime,
        timestamps.isAllDay,
        '#6C63FF',
        context.committeeId,
        context.subjectId,
        context.topicId,
        event.createdAt,
        event.updatedAt,
      ]
    );
  },

  update(event: CalendarEvent): void {
    const db = getDB();
    const timestamps = eventTimestamps(event);
    const context = resolveAcademicContext(event);
    db.runSync(
      `UPDATE calendar_events
       SET title = ?, description = ?, event_date = ?, start_time = ?, end_time = ?,
           is_all_day = ?, committee_id = ?, subject_id = ?, topic_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        event.title,
        event.description,
        event.date,
        timestamps.startTime,
        timestamps.endTime,
        timestamps.isAllDay,
        context.committeeId,
        context.subjectId,
        context.topicId,
        event.updatedAt,
        event.id,
      ]
    );
  },

  delete(id: string): void {
    const db = getDB();
    db.runSync('DELETE FROM calendar_events WHERE id = ?', [id]);
  },
};
