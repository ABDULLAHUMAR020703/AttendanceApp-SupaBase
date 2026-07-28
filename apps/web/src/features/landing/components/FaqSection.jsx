import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { FAQ_ITEMS } from '../landingContent';
import { FadeIn } from './motion';

/**
 * Section 4 — FAQ
 * Two-column split: sticky heading left, accordion list right.
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-[#F4F5F6] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:items-start">
        {/* Left — sticky heading */}
        <FadeIn className="lg:sticky lg:top-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7280]">
            Frequently Asked Questions
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
            Got questions?
            <br />
            We have answers.
          </h2>
        </FadeIn>

        {/* Right — accordion */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col gap-2">
            {FAQ_ITEMS.map((item, i) => {
              const open = openIndex === i;
              return (
                <div
                  key={item.q}
                  className={[
                    'overflow-hidden rounded-2xl transition-colors duration-300',
                    open ? 'bg-[#E9EBEE]' : 'bg-transparent hover:bg-[#ECEEF1]/70',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5 sm:py-[1.15rem]"
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    aria-expanded={open}
                  >
                    <span className="text-sm font-medium text-[#111827] sm:text-[15px]">
                      {item.q}
                    </span>
                    <motion.span
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#111827]',
                        open ? 'bg-white/80' : 'bg-[#E9EBEE]',
                      ].join(' ')}
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      aria-hidden
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-5 text-sm leading-relaxed text-[#6B7280] sm:px-5 sm:pb-5 sm:text-[15px] sm:leading-7">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
