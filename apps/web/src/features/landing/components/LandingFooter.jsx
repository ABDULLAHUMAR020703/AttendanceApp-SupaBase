/**
 * Minimal site footer under the CTA banner.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-[#DCEFF7] bg-[#F8FCFD] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — logo + copyright */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a href="#top" className="inline-flex items-center gap-2" aria-label="Hadir.ai home">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #00BFFF, #70C9EF)' }}
            />
            <span className="text-sm font-bold tracking-tight text-black">hadir.ai</span>
          </a>
          <span className="hidden h-3 w-px bg-[#DCEFF7] sm:inline-block" aria-hidden />
          <p className="text-xs text-[#64748B]">© 2026 Hadir.ai. All rights reserved.</p>
        </div>

        {/* Right — privacy + social */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#64748B]">
          <a href="#approach" className="transition hover:text-[#00BFFF]">
            Privacy Policy
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-[#00BFFF]"
          >
            LinkedIn
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-[#00BFFF]"
          >
            X
          </a>
          <a href="mailto:hello@hadir.ai" className="transition hover:text-[#00BFFF]">
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
