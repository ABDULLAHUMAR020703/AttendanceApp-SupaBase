import { useEffect, useRef, useState } from 'react';

/**
 * Polls without toggling loading state — avoids UI flash on background refresh.
 */
export function useSilentPoll(callback, intervalMs = 30000, deps = []) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!intervalMs || intervalMs < 5000) return undefined;
    const id = setInterval(() => {
      saved.current?.(true);
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}

/**
 * Persist simple filter state across navigations within the session.
 */
export function useSessionState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const set = (value) => {
    setState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  return [state, set];
}
