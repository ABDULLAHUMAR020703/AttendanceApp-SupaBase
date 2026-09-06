import Lenis from 'lenis';

/**
 * One Lenis instance for the whole SPA. Landing/auth use the window; the admin
 * chrome attaches to `.admin-main` so the sidebar stays put while the page
 * column is the only vertical scroller.
 *
 * lerp stays close to native (default 0.1 is a touch floaty). 0.16 tracks the
 * wheel closely enough to feel controlled rather than cinematic.
 *
 * `autoToggle` is intentionally OFF. In that mode Lenis drives its running state
 * from a 1ms discrete `overflow` transition on the wrapper and turns `stop()` /
 * `start()` into async no-ops that only take effect on the next `transitionend`.
 * We also lock/unlock the scroller imperatively (modals, drawers, the mobile
 * nav) via `lockPageScroll()`, and the two mechanisms race: an unlock that lands
 * before the toggle transition resolves leaves the wrapper stuck at
 * `overflow: clip` with Lenis parked, so the page can no longer scroll at all
 * (mouse, trackpad, touch or scrollbar). Plain `stop()`/`start()` — synchronous
 * `internalStop`/`internalStart` — plus the existing `data-scroll-locked`
 * attribute is the reliable path.
 */
const LENIS_OPTIONS = {
  autoRaf: true,
  anchors: true,
  stopInertiaOnNavigate: true,
  lerp: 0.16,
  wheelMultiplier: 0.95,
  touchMultiplier: 1,
  overscroll: true,
  respectReducedMotion: true,
};

let lenis = null;
let lockCount = 0;

export function getLenis() {
  return lenis;
}

export function createLenis(options = {}) {
  destroyLenis();
  lenis = new Lenis({ ...LENIS_OPTIONS, ...options });
  return lenis;
}

export function destroyLenis() {
  lockCount = 0;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('page-scroll-locked');
  }
  if (!lenis) return;
  const wrapper = lenis.rootElement;
  if (wrapper && wrapper.dataset) delete wrapper.dataset.scrollLocked;
  lenis.destroy();
  lenis = null;
}

export function lockPageScroll() {
  lockCount += 1;
  if (lockCount !== 1 || !lenis) {
    if (lockCount === 1) lenis?.stop();
    return;
  }
  lenis.stop();
  const wrapper = lenis.rootElement;
  if (wrapper && wrapper !== window && wrapper !== document.documentElement) {
    wrapper.dataset.scrollLocked = 'true';
  } else if (typeof document !== 'undefined') {
    document.documentElement.classList.add('page-scroll-locked');
  }
}

export function unlockPageScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;

  const wrapper = lenis?.rootElement;
  if (wrapper && wrapper !== window && wrapper !== document.documentElement) {
    delete wrapper.dataset.scrollLocked;
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('page-scroll-locked');
  }

  if (!lenis) return;
  const overflowLocked =
    wrapper &&
    wrapper !== window &&
    typeof window !== 'undefined' &&
    getComputedStyle(wrapper).overflowY === 'hidden';
  if (!overflowLocked) lenis.start();
}

export function resetScrollPosition() {
  const instance = lenis;
  const wrapper = instance?.rootElement;

  if (instance) {
    instance.scrollTo(0, { immediate: true });
  }

  if (wrapper && wrapper !== window && wrapper !== document.documentElement) {
    wrapper.scrollTop = 0;
  } else if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}
