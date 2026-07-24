/**
 * Stale-while-revalidate helpers for screen focus / pull refresh.
 * Keeps existing UI visible while a background refresh runs.
 */
import { useCallback, useRef } from 'react';

/**
 * @param {() => Promise<void>} loadFn - async data loader (must not clear UI before fetch when soft)
 * @param {{ minIntervalMs?: number }} [options]
 */
export function useStaleWhileRevalidate(loadFn, options = {}) {
  const minIntervalMs = options.minIntervalMs ?? 2_000;
  const loadFnRef = useRef(loadFn);
  loadFnRef.current = loadFn;
  const inFlightRef = useRef(null);
  const lastCompletedAtRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const run = useCallback(async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && inFlightRef.current) {
      return inFlightRef.current;
    }
    if (!force && hasLoadedRef.current && now - lastCompletedAtRef.current < minIntervalMs) {
      return;
    }

    const promise = (async () => {
      try {
        await loadFnRef.current();
        hasLoadedRef.current = true;
        lastCompletedAtRef.current = Date.now();
      } finally {
        if (inFlightRef.current === promise) {
          inFlightRef.current = null;
        }
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [minIntervalMs]);

  return {
    refresh: run,
    /** Soft focus refresh: skip if recently loaded / in-flight. */
    refreshOnFocus: useCallback(() => run({ force: false }), [run]),
    /** Pull-to-refresh / explicit: always run (still coalesces in-flight). */
    refreshForced: useCallback(() => run({ force: true }), [run]),
    hasLoadedRef,
  };
}
