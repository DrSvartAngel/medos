import { useCallback, useEffect, useRef, useState } from 'react';
import { runMigrations } from '@/db/migrations';
import { useAppStore } from '@/store/useAppStore';

/**
 * Runs SQLite migrations once on mount.
 * Sets isDBReady in the app store when complete.
 */
export function useDB() {
  const [error, setError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const attemptRef = useRef(0);
  const setDBReady = useAppStore((s) => s.setDBReady);
  const setDBError = useAppStore((s) => s.setDBError);

  const retry = useCallback(async () => {
    const attempt = ++attemptRef.current;
    setIsInitializing(true);
    setError(null);
    setDBReady(false);
    setDBError(null);

    try {
      await runMigrations();
      if (attempt !== attemptRef.current) return;
      setError(null);
      setDBError(null);
      setDBReady(true);
    } catch (caught) {
      if (attempt !== attemptRef.current) return;
      console.error('[useDB] Migration failed:', caught);
      const nextError =
        caught instanceof Error ? caught : new Error('Could not initialize local data.');
      setError(nextError);
      setDBReady(false);
      setDBError(nextError.message);
    } finally {
      if (attempt === attemptRef.current) setIsInitializing(false);
    }
  }, [setDBError, setDBReady]);

  useEffect(() => {
    void retry();
    return () => {
      attemptRef.current += 1;
    };
  }, [retry]);

  return { error, isInitializing, retry };
}
