import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../landingContent';

function HadirMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <rect x="2" y="11" width="3.5" height="7" rx="1" />
      <rect x="8.25" y="6" width="3.5" height="12" rx="1" />
      <rect x="14.5" y="2" width="3.5" height="16" rx="1" />
    </svg>
  );
}

/**
 * Floating glass navbar — Apple HIG materials, translucent teal CTA.
 * @param {{ onSignInClick: () => void }} props
 */
export function LandingNav({ onSignInClick }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-4 sm:px-5 sm:pt-5 lg:px-8"
      initial={reduce ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className={[
          'landing-nav-shell pointer-events-auto mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-[22px]',
          'py-2 pl-4 pr-2 sm:pl-5 sm:pr-2',
          scrolled ? 'landing-nav-shell--scrolled' : '',
        ].join(' ')}
        transition={{ duration: 0.2 }}
      >
        <a
          href="#top"
          className="landing-display flex shrink-0 items-center gap-2 text-[#111827]"
          aria-label="Hadir.ai home"
        >
          <HadirMark className="h-[18px] w-[18px]" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Hadir.ai</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="landing-text rounded-full px-3 py-2 text-[13px] font-medium text-[#111827]/75 transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <motion.button
            type="button"
            onClick={onSignInClick}
            className="landing-cta-waitlist hidden rounded-full px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#014871] sm:inline-flex"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Join Waitlist
          </motion.button>

          <button
            type="button"
            className="inline-flex rounded-full p-2 text-[#111827] hover:bg-black/[0.04] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="landing-nav-shell pointer-events-auto mx-auto mt-2 max-w-4xl overflow-hidden rounded-3xl p-3 md:hidden"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col gap-0.5">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="landing-text rounded-2xl px-3 py-2.5 text-sm font-medium text-[#111827] hover:bg-black/[0.04]"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignInClick();
                }}
                className="landing-cta-waitlist mt-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#014871]"
              >
                Join Waitlist
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
