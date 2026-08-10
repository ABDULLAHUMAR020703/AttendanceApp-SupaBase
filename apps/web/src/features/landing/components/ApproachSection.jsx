import { APPROACH_PARAGRAPHS } from '../landingContent';
import { FadeIn } from './motion';

/**
 * Section 3 — OUR APPROACH
 * Clean editorial manifesto on a light canvas.
 */
export function ApproachSection() {
  return (
    <section
      id="approach"
      className="relative bg-[#F8FCFD] px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-40"
    >
      {/* Soft seam from section above */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#DCEFF7]/60 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-2xl">
        <FadeIn>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00BFFF]">
            Our Approach
          </p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[2.85rem] lg:leading-[1.15]">
            Let&apos;s make software for people.
          </h2>
        </FadeIn>

        <div className="mt-10 space-y-7">
          {APPROACH_PARAGRAPHS.map((p, i) => (
            <FadeIn key={i} delay={0.12 + i * 0.08}>
              <p className="text-left text-base leading-[1.8] text-[#64748B] sm:text-[1.075rem] sm:leading-[1.85]">
                {p}
              </p>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3}>
          <div className="mt-14 flex items-center gap-3 border-t border-[#DCEFF7] pt-8">
            <span
              className="h-8 w-8 shrink-0 rounded-full"
              style={{ background: 'linear-gradient(145deg, #00BFFF, #70C9EF)' }}
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">The Team at Hadir.ai</p>
              <p className="text-xs text-[#64748B]">Building quieter tools for louder workdays</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
