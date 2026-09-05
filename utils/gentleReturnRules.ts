export const GENTLE_BREAK_DURATION_SEC = 2 * 60;

export function getGentleBreakRemainingSec(
  startedAt: number,
  now = Date.now()
): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;

  const elapsedSec = Math.max(0, now - startedAt) / 1000;
  return Math.max(0, Math.ceil(GENTLE_BREAK_DURATION_SEC - elapsedSec));
}
