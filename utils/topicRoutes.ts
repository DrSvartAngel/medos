import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';

export function topicRouteId(value: unknown): string {
  return typeof value === 'string' && value.trim() && !/[\u0000-\u001f\u007f]/.test(value) ? value : '';
}

/** IDs come from verified records; each destination is checked again before use. */
export function topicFallback(committeeId: string, subjectId: string, topicId?: string): string {
  if (!committeeId || !committeeRepo.getById(committeeId)) return '/(tabs)/committees';
  const subject = subjectId ? subjectRepo.getById(subjectId) : null;
  if (subject?.committeeId === committeeId) {
    const topic = topicId ? topicRepo.getById(topicId) : null;
    if (topic?.subjectId === subject.id) return `/topics/${encodeURIComponent(topic.id)}`;
    return `/subjects/${encodeURIComponent(subject.id)}`;
  }
  return `/committees/${encodeURIComponent(committeeId)}`;
}
