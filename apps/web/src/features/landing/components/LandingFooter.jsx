/**
 * Minimal site footer under the CTA banner.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-[#E2F3F5] bg-[#F8FDFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — logo + copyright */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a href="#top" className="inline-flex items-center gap-2" aria-label="Hadir.ai home">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #0097A7, #006978)' }}
            />
            <span className="text-sm font-bold tracking-tight text-black">hadir.ai</span>
          </a>
          <span className="hidden h-3 w-px bg-[#E2F3F5] sm:inline-block" aria-hidden />
          <p className="text-xs text-[#475569]">© 2026 Hadir.ai. All rights reserved.</p>
        </div>

        {/* Right — privacy + social */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#475569]">
          <a href="#approach" className="transition hover:text-[#00838F]">
            Privacy Policy
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-[#00838F]"
          >
            LinkedIn
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-[#00838F]"
          >
            X
          </a>
          <a href="mailto:hello@hadir.ai" className="transition hover:text-[#00838F]">
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
