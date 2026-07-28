import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { LandingNav } from '../components/LandingNav';
import { LandingHero } from '../components/LandingHero';
import { WhyHadirSection } from '../components/WhyHadirSection';
import { ApproachSection } from '../components/ApproachSection';
import { FaqSection } from '../components/FaqSection';
import { FinalCta } from '../components/FinalCta';
import { LandingFooter } from '../components/LandingFooter';

/**
 * Hadir.ai marketing landing — Functional-inspired layout + brand gradient.
 *
 * Auth integration point:
 *   onSignInClick → navigate('/login') or '/dashboard' if already signed in
 */
export function LandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // ── Expose auth redirect at the top level for easy integration ───────────
  const onSignInClick = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <div className="landing-page min-h-screen bg-[#F8FBFC] text-[#111827] antialiased">
      <LandingNav onSignInClick={onSignInClick} />
      <main>
        <LandingHero onSignInClick={onSignInClick} />
        <WhyHadirSection />
        <ApproachSection />
        <FaqSection />
        <FinalCta onSignInClick={onSignInClick} />
      </main>
      <LandingFooter />
    </div>
  );
}
