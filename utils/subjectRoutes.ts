import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';

export function subjectRouteId(value: unknown): string {
  return typeof value === 'string' && value.trim() && !/[\u0000-\u001f\u007f]/.test(value) ? value : '';
}

/** Read-only destination resolution. Never return a deleted Subject or parent. */
export function subjectFallback(committeeId: string, subjectId?: string): string {
  if (!committeeId || !committeeRepo.getById(committeeId)) return '/(tabs)/committees';
  if (subjectId) {
    const subject = subjectRepo.getById(subjectId);
    if (subject?.committeeId === committeeId) return `/subjects/${encodeURIComponent(subject.id)}`;
  }
  return `/committees/${encodeURIComponent(committeeId)}`;
}
