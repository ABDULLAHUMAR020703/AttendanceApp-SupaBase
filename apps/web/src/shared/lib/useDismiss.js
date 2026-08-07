import { useEffect, useRef } from 'react';

/**
 * Dismissible popover: closes on outside pointer-down and on Escape.
 *
 * Returns a ref to spread on the popover root — anything inside that root counts
 * as "inside", so triggers and panels can live together without the panel closing
 * itself the moment you click it.
 *
 * `extraRef` covers panels rendered through a portal, which sit outside the root
 * in the DOM and would otherwise read as an outside click.
 */
export function useDismiss(onDismiss, extraRef) {
  const ref = useRef(null);

  useEffect(() => {
    const onPointer = (event) => {
      const inside =
        ref.current?.contains(event.target) || extraRef?.current?.contains(event.target);
      if (!inside) onDismiss();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onDismiss, extraRef]);

  return ref;
}
