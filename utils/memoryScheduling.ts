export const REVIEW_DAY_MS = 86400000;
export type ScheduleState = 'unscheduled' | 'learning' | 'reviewing';
export interface SchedulingState { state: ScheduleState; intervalDays: number; nextReviewAt: number }

/** Simple interval policy, not a prediction of memory or mastery. Intervals are elapsed 24-hour days. */
export function scheduleReview(previous: Pick<SchedulingState, 'state' | 'intervalDays'>,
  rating: string, reviewedAt: number): SchedulingState {
  if (!Number.isSafeInteger(reviewedAt) || reviewedAt < 0 || !Number.isFinite(new Date(reviewedAt).getTime()))
    throw new Error('Invalid review timestamp');
  if (!['again','hard','good','easy'].includes(rating)) throw new Error('Invalid review rating');
  if (!['unscheduled','learning','reviewing'].includes(previous.state)) throw new Error('Invalid scheduling state');
  if (previous.state !== 'unscheduled' && (!Number.isSafeInteger(previous.intervalDays) || previous.intervalDays < 0))
    throw new Error('Invalid review interval');
  if (rating === 'again') {
    const nextReviewAt = reviewedAt + 600000;
    if (!Number.isFinite(new Date(nextReviewAt).getTime())) throw new Error('Review date out of range');
    return {state:'learning', intervalDays:0, nextReviewAt};
  }
  const first = previous.state === 'unscheduled' || previous.intervalDays === 0;
  const initial = rating === 'hard' ? 1 : rating === 'good' ? 3 : 7;
  const multiplier = rating === 'hard' ? 1.2 : rating === 'good' ? 2 : 3;
  const intervalDays = first ? initial : Math.max(previous.intervalDays + 1, Math.ceil(previous.intervalDays * multiplier));
  const nextReviewAt = reviewedAt + intervalDays * REVIEW_DAY_MS;
  if (!Number.isSafeInteger(nextReviewAt) || !Number.isFinite(new Date(nextReviewAt).getTime()))
    throw new Error('Review date out of range');
  return {state:'reviewing', intervalDays, nextReviewAt};
}
