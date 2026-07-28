/**
 * Minimal site footer under the CTA banner.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-[#2A2E35] bg-[#0D0F12] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — logo + copyright */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a href="#top" className="inline-flex items-center gap-2" aria-label="Hadir.ai home">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #014871, #A0EBCF)' }}
            />
            <span className="text-sm font-semibold tracking-tight text-white">hadir.ai</span>
          </a>
          <span className="hidden h-3 w-px bg-[#2A2E35] sm:inline-block" aria-hidden />
          <p className="text-xs text-[#6B7280]">© 2026 Hadir.ai. All rights reserved.</p>
        </div>

        {/* Right — privacy + social */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#6B7280]">
          <a href="#approach" className="transition hover:text-white">
            Privacy Policy
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            LinkedIn
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            X
          </a>
          <a href="mailto:hello@hadir.ai" className="transition hover:text-white">
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
