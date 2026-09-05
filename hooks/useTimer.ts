import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getElapsedSec, useFocusStore } from '@/store/useFocusStore';

interface TimerSnapshot {
  displaySec: number;
  elapsedSec: number;
  isOvertime: boolean;
}

/**
 * Drives UI refreshes while deriving all timer values from real timestamps.
 * The interval never decrements or persists timer state.
 */
export function useTimer(): TimerSnapshot {
  const timerStatus = useFocusStore((state) => state.timerStatus);
  const plannedSec = useFocusStore((state) => state.plannedSec);
  const runningSince = useFocusStore((state) => state.runningSince);
  const accumulatedSec = useFocusStore((state) => state.accumulatedSec);
  const markOvertime = useFocusStore((state) => state.markOvertime);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());

    const interval =
      timerStatus === 'running' || timerStatus === 'overtime'
        ? setInterval(() => setNow(Date.now()), 500)
        : null;

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') setNow(Date.now());
    });

    return () => {
      if (interval !== null) clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [timerStatus]);

  const elapsed = getElapsedSec({ timerStatus, runningSince, accumulatedSec }, now);
  const isOvertime = timerStatus !== 'idle' && elapsed >= plannedSec;

  useEffect(() => {
    if (timerStatus === 'running' && isOvertime) markOvertime();
  }, [isOvertime, markOvertime, timerStatus]);

  const displaySec =
    timerStatus === 'idle'
      ? plannedSec
      : isOvertime
        ? Math.floor(elapsed - plannedSec)
        : Math.max(0, Math.ceil(plannedSec - elapsed));

  return {
    displaySec,
    elapsedSec: Math.floor(elapsed),
    isOvertime,
  };
}
