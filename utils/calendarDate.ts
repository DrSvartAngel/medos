export type LocalDateKey = string;

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

export interface CalendarGridDay {
  key: LocalDateKey;
  dayNumber: number;
  inVisibleMonth: boolean;
}

export interface CalendarGridRange {
  days: CalendarGridDay[];
  startDate: LocalDateKey;
  endDateExclusive: LocalDateKey;
  startMs: number;
  endMs: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseLocalDateKey(value: string): LocalDateParts | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidLocalDateKey(value: string): boolean {
  return parseLocalDateKey(value) !== null;
}

export function formatLocalDateKey(value: Date | number): LocalDateKey {
  const date = typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date value');
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayLocalDateKey(now = new Date()): LocalDateKey {
  return formatLocalDateKey(now);
}

function civilDayNumber(year: number, month: number, day: number): number {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra;
}

export function shiftLocalDateKey(
  dateKey: LocalDateKey,
  amount: number
): LocalDateKey {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) throw new Error('Invalid local date');
  return formatLocalDateKey(
    new Date(parts.year, parts.month - 1, parts.day + amount, 12, 0, 0, 0)
  );
}

export function differenceInLocalCalendarDays(
  fromDate: LocalDateKey,
  toDate: LocalDateKey
): number {
  const from = parseLocalDateKey(fromDate);
  const to = parseLocalDateKey(toDate);
  if (!from || !to) throw new Error('Invalid local date');
  return (
    civilDayNumber(to.year, to.month, to.day) -
    civilDayNumber(from.year, from.month, from.day)
  );
}

export function monthStartKey(dateKey: LocalDateKey): LocalDateKey {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) throw new Error('Invalid local date');
  return `${parts.year}-${pad2(parts.month)}-01`;
}

export function parseLocalTime(value: string): { hour: number; minute: number } | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function localTimeToMinutes(value: string): number | null {
  const time = parseLocalTime(value);
  return time ? time.hour * 60 + time.minute : null;
}

export function formatLocalTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid time value');
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function localDateTimeToTimestamp(
  dateKey: LocalDateKey,
  time: string | null
): number | null {
  const date = parseLocalDateKey(dateKey);
  if (!date) return null;

  const parsedTime = time === null ? { hour: 0, minute: 0 } : parseLocalTime(time);
  if (!parsedTime) return null;

  const candidate = new Date(
    date.year,
    date.month - 1,
    date.day,
    parsedTime.hour,
    parsedTime.minute,
    0,
    0
  );

  if (
    candidate.getFullYear() !== date.year ||
    candidate.getMonth() !== date.month - 1 ||
    candidate.getDate() !== date.day
  ) {
    return null;
  }

  // A requested wall-clock time that the OS normalizes through a DST gap is invalid.
  if (
    time !== null &&
    (candidate.getHours() !== parsedTime.hour || candidate.getMinutes() !== parsedTime.minute)
  ) {
    return null;
  }

  return candidate.getTime();
}

export function getLocalDayRange(dateKey: LocalDateKey): { startMs: number; endMs: number } {
  const parts = parseLocalDateKey(dateKey);
  const startMs = localDateTimeToTimestamp(dateKey, null);
  if (!parts || startMs === null) throw new Error('Invalid local date');

  const nextDay = new Date(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0, 0);
  return { startMs, endMs: nextDay.getTime() };
}

export function shiftMonth(monthKey: LocalDateKey, amount: number): LocalDateKey {
  const parts = parseLocalDateKey(monthKey);
  if (!parts) throw new Error('Invalid visible month');
  const shifted = new Date(parts.year, parts.month - 1 + amount, 1, 12, 0, 0, 0);
  return formatLocalDateKey(shifted);
}

export function getVisibleGridDays(monthKey: LocalDateKey): CalendarGridDay[] {
  const parts = parseLocalDateKey(monthStartKey(monthKey));
  if (!parts) throw new Error('Invalid visible month');

  const firstOfMonth = new Date(parts.year, parts.month - 1, 1, 12, 0, 0, 0);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(parts.year, parts.month - 1, 1 - mondayOffset + index, 12, 0, 0, 0);
    return {
      key: formatLocalDateKey(date),
      dayNumber: date.getDate(),
      inVisibleMonth:
        date.getFullYear() === parts.year && date.getMonth() === parts.month - 1,
    };
  });
}

export function getVisibleGridRange(monthKey: LocalDateKey): CalendarGridRange {
  const days = getVisibleGridDays(monthKey);
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) throw new Error('Calendar grid is empty');

  const lastParts = parseLocalDateKey(last.key);
  const startMs = localDateTimeToTimestamp(first.key, null);
  if (!lastParts || startMs === null) throw new Error('Invalid calendar range');

  const endDate = new Date(lastParts.year, lastParts.month - 1, lastParts.day + 1, 12, 0, 0, 0);
  const endDateExclusive = formatLocalDateKey(endDate);
  const endMs = localDateTimeToTimestamp(endDateExclusive, null);
  if (endMs === null) throw new Error('Invalid calendar range end');

  return { days, startDate: first.key, endDateExclusive, startMs, endMs };
}

export function formatMonthLabel(monthKey: LocalDateKey, locale = 'en-US'): string {
  const parts = parseLocalDateKey(monthKey);
  if (!parts) throw new Error('Invalid visible month');
  return new Date(parts.year, parts.month - 1, 1, 12, 0, 0, 0).toLocaleDateString(
    locale,
    { month: 'long', year: 'numeric' }
  );
}

export function formatAgendaDate(dateKey: LocalDateKey, locale = 'en-US'): string {
  const parts = parseLocalDateKey(dateKey);
  if (!parts) throw new Error('Invalid selected date');
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0).toLocaleDateString(
    locale,
    { weekday: 'long', month: 'long', day: 'numeric' }
  );
}
