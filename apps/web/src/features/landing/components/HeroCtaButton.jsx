import { ArrowRight } from 'lucide-react';

/**
 * Landing CTA route helpers.
 *
 * Create Free Account (nav):
 * - Dev: /onboard → CompanyOnboardingPage
 * - Prod: https://hadir.techdotglobal.com/onboard
 * - Backend: POST /api/auth/onboard-company
 *
 * Book Demo (hero + contact CTA):
 * - Demo intake mailbox (swap for Calendly/CRM when available)
 * - Sign-in: /login → POST /api/auth/login
 */
export const ONBOARD_URL = 'https://hadir.techdotglobal.com/onboard';
export const LOGIN_PATH = '/login';

/** Demo booking intake — replace with Calendly/CRM URL when provisioned. */
export const DEMO_BOOKING_URL =
  'mailto:demo@hadir.ai?subject=Book%20a%20Hadir.ai%20Demo&body=Hi%20Hadir%20team%2C%0A%0AI%27d%20like%20to%20book%20a%20product%20demo.%0A%0ACompany%3A%20%0AName%3A%20%0APreferred%20time%3A%20';

export const resolveOnboardHref = () =>
  import.meta.env.DEV ? '/onboard' : ONBOARD_URL;

export const resolveDemoHref = () => DEMO_BOOKING_URL;

const CTA_CLASS =
  'group inline-flex items-center justify-center gap-2 rounded-[15px] bg-[#00BFFF] px-6 py-3.5 text-[15px] font-bold tracking-[-0.01em] text-white shadow-[0_12px_28px_rgba(0,191,255,0.32)] transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-[#00A8E6] hover:shadow-[0_18px_40px_rgba(0,168,230,0.38)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]/55 focus-visible:ring-offset-4 active:translate-y-0 active:scale-[0.98] active:bg-[#0090C4]';

/**
 * Hero primary CTA — Book Demo → demo intake backend.
 */
export function HeroCtaButton({
  href = resolveDemoHref(),
  label = 'Book Demo',
  className = '',
}) {
  return (
    <a
      href={href}
      className={`${CTA_CLASS} ${className}`.trim()}
      aria-label={`${label} — request a Hadir.ai product demo`}
    >
      <span>{label}</span>
      <ArrowRight
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        strokeWidth={2.5}
        aria-hidden
      />
    </a>
  );
}
