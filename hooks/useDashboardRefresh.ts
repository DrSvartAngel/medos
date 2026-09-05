import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function millisecondsUntilNextLocalMidnight(now = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(1000, nextMidnight.getTime() - now.getTime() + 250);
}

export function useDashboardRefresh(enabled: boolean, refresh: () => void): void {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;

      let midnightTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleMidnightRefresh = () => {
        if (midnightTimer !== null) clearTimeout(midnightTimer);
        midnightTimer = setTimeout(() => {
          refresh();
          scheduleMidnightRefresh();
        }, millisecondsUntilNextLocalMidnight());
      };

      refresh();
      scheduleMidnightRefresh();
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          refresh();
          scheduleMidnightRefresh();
        }
      });

      return () => {
        subscription.remove();
        if (midnightTimer !== null) clearTimeout(midnightTimer);
      };
    }, [enabled, refresh])
  );
}
