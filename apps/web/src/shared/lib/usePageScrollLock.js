import { useEffect } from 'react';
import { lockPageScroll, unlockPageScroll } from './smoothScroll';

/** Pause the primary page scroller while a modal, drawer or overlay owns input. */
export function usePageScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockPageScroll();
    return () => unlockPageScroll();
  }, [active]);
}
