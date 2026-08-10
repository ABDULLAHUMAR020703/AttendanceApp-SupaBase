import { useEffect, useId, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

const LOGO_PATH = '/logo.jpeg';

const NAV_ITEMS = [
  { href: '#product', label: 'Product' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#company', label: 'Integrations' },
  { href: '#security', label: 'Security' },
  { href: '#contact', label: 'Contact' },
];

function HadirMark() {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={LOGO_PATH}
        alt="Hadir.ai logo"
        className="h-8 w-8 rounded-[15px] object-cover shadow-[0_8px_20px_rgba(15,23,42,0.10)]"
      />
      <span className="text-[15px] font-extrabold tracking-[-0.02em] text-black">Hadir.ai</span>
    </span>
  );
}

export function LandingNav({ onSignInClick, onCreateAccountClick }) {
  const mobileMenuId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hiddenPastHero, setHiddenPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('top');
      const hidePoint = hero ? Math.max(120, hero.offsetTop + hero.offsetHeight - 96) : window.innerHeight * 0.65;
      setScrolled(window.scrollY > 24);
      setHiddenPastHero(window.scrollY > hidePoint);
      if (window.scrollY > hidePoint) setMobileOpen(false);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out ${hiddenPastHero ? '-translate-y-full' : 'translate-y-0'}`}>
      <div
        className={[
          'w-full border-b border-[#DCEFF7] bg-[#F8FCFD]/80 backdrop-blur-md transition-all duration-200 ease-out',
          scrolled ? 'shadow-[0_10px_30px_rgba(0,136,199,0.07)]' : 'shadow-none',
        ].join(' ')}
      >
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a href="#top" aria-label="Hadir.ai home" onClick={closeMobile} className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF] focus-visible:ring-offset-2">
            <HadirMark />
          </a>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group relative text-[15px] font-medium tracking-[-0.01em] text-slate-700 transition duration-200 ease-out hover:text-[#00BFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]/50 focus-visible:ring-offset-4"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[#00BFFF] transition-transform duration-200 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <button
              type="button"
              onClick={onSignInClick}
              className="text-[15px] font-semibold tracking-[-0.01em] text-slate-700 transition duration-200 hover:text-[#00BFFF]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onCreateAccountClick}
              className="inline-flex items-center justify-center gap-2 rounded-[15px] bg-[#00BFFF] px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,191,255,0.28)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#00A8E6] hover:shadow-[0_16px_34px_rgba(0,168,230,0.30)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]/45 focus-visible:ring-offset-4 active:scale-[0.98] active:bg-[#00A8E6]"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[#0F172A] transition hover:bg-[#E0F6FC] lg:hidden"
            aria-controls={mobileMenuId}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div id={mobileMenuId} className="border-t border-[#DCEFF7] px-3 pb-3 pt-2 lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#E0F6FC] hover:text-[#00BFFF]"
                  onClick={closeMobile}
                >
                  {item.label}
                </a>
              ))}
              <button type="button" onClick={onSignInClick} className="mt-1 rounded-2xl border border-[#DCEFF7] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A]">
                Sign In
              </button>
              <button type="button" onClick={() => { closeMobile(); onCreateAccountClick?.(); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00BFFF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#00A8E6] active:bg-[#00A8E6]">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
