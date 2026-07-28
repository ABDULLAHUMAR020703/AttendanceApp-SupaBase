import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { FadeIn } from './motion';

/**
 * Final CTA banner — early access / portal sign-in trigger.
 * @param {{ onSignInClick: () => void }} props
 */
export function FinalCta({ onSignInClick }) {
  const [email, setEmail] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (email.trim()) sessionStorage.setItem('hadir_landing_email', email.trim());
    onSignInClick();
  };

  return (
    <section id="signin" className="bg-[#0D0F12] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <FadeIn>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Early Access &amp; Portal Sign-In
          </p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Can&apos;t wait? We neither.
          </h2>
        </FadeIn>

        <FadeIn delay={0.12}>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[#9CA3AF]">
            Enter your work email and jump into the Hadir.ai admin portal — attendance, approvals,
            and analytics ready in minutes.
          </p>
        </FadeIn>

        <FadeIn delay={0.16} className="mt-9">
          <form
            onSubmit={submit}
            className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-[#2A2E35] bg-[#1A1D21] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 pl-3.5">
              <Mail className="h-4 w-4 shrink-0 text-[#6B7280]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="w-full min-w-0 border-0 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-[#6B7280]"
                aria-label="Work email"
              />
            </div>
            <motion.button
              type="submit"
              className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0D0F12] transition hover:bg-[#F8FBFC] sm:px-5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Go to Sign In
            </motion.button>
          </form>
        </FadeIn>
      </div>
    </section>
  );
}
