import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowUpRight } from 'lucide-react';
import { FloatingCard, HeroIntro } from './motion';
import { HeroMeshBackground } from './HeroMeshBackground';
import { LiveStatusCard } from './LiveStatusCard';

/**
 * Hero — neural atmosphere, SF Pro hierarchy, glass email bar, product card.
 * @param {{ onSignInClick: () => void }} props
 */
export function LandingHero({ onSignInClick }) {
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (email.trim()) sessionStorage.setItem('hadir_landing_email', email.trim());
    onSignInClick();
  };

  return (
    <section
      id="top"
      className="landing-hero relative min-h-[100svh] overflow-hidden bg-[#F8FBFC] px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8"
    >
      <HeroMeshBackground />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <HeroIntro delay={0.08}>
          <p className="landing-brand mb-5 text-[15px] font-semibold tracking-[-0.02em] text-[#014871]">
            Hadir.ai
          </p>
        </HeroIntro>

        <HeroIntro delay={0.12}>
          <h1 className="landing-display text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-[#111827] sm:text-[3.25rem] lg:text-[3.75rem]">
            Attendance done right.
            <br />
            Wellbeing done better.
          </h1>
        </HeroIntro>

        <HeroIntro delay={0.22}>
          <p className="landing-text mx-auto mt-6 max-w-[34rem] text-[1.05rem] font-normal leading-[1.65] text-[#5C6570] sm:text-[1.125rem]">
            Automated check-ins, leave tracking, and workforce operations — built to stay out of
            the way and keep teams healthy.
          </p>
        </HeroIntro>

        <HeroIntro delay={0.32} className="mt-9 w-full">
          <form
            onSubmit={submit}
            className={[
              'landing-glass-field mx-auto flex w-full max-w-xl items-center gap-1.5 rounded-full p-1.5 transition-[box-shadow,border-color] duration-300',
              focused
                ? 'border border-[#A0EBCF]/70 shadow-[0_0_0_4px_rgba(160,235,207,0.18),0_16px_48px_rgba(1,72,113,0.1)]'
                : 'border border-white/70 shadow-[0_14px_44px_rgba(1,72,113,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]',
            ].join(' ')}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-4">
              <Mail className="h-[15px] w-[15px] shrink-0 text-[#8B95A1]" strokeWidth={1.75} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter your work email"
                className="landing-text w-full min-w-0 border-0 bg-transparent py-3 text-[15px] text-[#111827] outline-none placeholder:text-[#9AA3AE]"
                aria-label="Work email"
              />
            </div>
            <motion.button
              type="submit"
              className="landing-cta-primary group inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-3 text-[14px] font-semibold tracking-[-0.01em] text-white sm:px-6"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
            >
              Launch Portal
              <ArrowUpRight className="h-3.5 w-3.5 opacity-90 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </motion.button>
          </form>
        </HeroIntro>
      </div>

      <HeroIntro delay={0.42} className="relative z-10 mx-auto mt-14 max-w-[21.5rem] sm:mt-16 sm:max-w-[24rem]">
        <FloatingCard>
          <LiveStatusCard />
        </FloatingCard>
      </HeroIntro>
    </section>
  );
}
