/**
 * Integration logo carousel — vector brand marks in an infinite horizontal marquee.
 * Muted/grayscale by default; full brand color on hover. Pauses on hover.
 */

function TeamsMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#6264A7" />
      <circle cx="14.2" cy="9.2" r="2.35" fill="#fff" />
      <path d="M9.6 17.4c0-2.15 2-3.8 4.6-3.8s4.6 1.65 4.6 3.8V18H9.6v-.6Z" fill="#fff" />
      <circle cx="8.4" cy="10.4" r="1.9" fill="#BDBDEF" />
      <path d="M5.2 17.4c0-1.7 1.4-3.05 3.35-3.05.45 0 .88.07 1.28.2A4.3 4.3 0 0 0 8.4 17.4V18H5.2v-.6Z" fill="#BDBDEF" />
    </svg>
  );
}

function GoogleWorkspaceMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 6.2 12 1.5l8 4.7v5.8L12 16.7 4 12V6.2Z" fill="#EA4335" />
      <path d="M4 12 12 16.7V22l-8-4.7V12Z" fill="#34A853" />
      <path d="M12 16.7 20 12v5.3L12 22v-5.3Z" fill="#FBBC04" />
      <path d="M12 1.5 20 6.2v5.8L12 7.3V1.5Z" fill="#4285F4" />
    </svg>
  );
}

function OutlookMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#0078D4" />
      <path d="M4.5 7.25h15v9.5h-15v-9.5Z" fill="#fff" fillOpacity=".18" />
      <path d="M4.5 7.25 12 12.75l7.5-5.5H4.5Z" fill="#fff" />
      <path d="M4.5 7.25v1.7L12 14.4l7.5-5.45v-1.7H4.5Z" fill="#28A8EA" />
      <path d="M4.5 8.95V16.75L12 14.4 4.5 8.95Zm15 0L12 14.4l7.5 2.35V8.95Z" fill="#0078D4" fillOpacity=".35" />
    </svg>
  );
}

function QuickBooksMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#2CA01C" />
      <path
        d="M8.1 12.05a3.9 3.9 0 0 1 3.9-3.9h1.15V5.85H12A6.15 6.15 0 0 0 5.85 12 6.15 6.15 0 0 0 12 18.15h1.15v-2.3H12a3.9 3.9 0 0 1-3.9-3.8Zm3.9-1.55h2.9v3.1H12a1.55 1.55 0 1 1 0-3.1Zm5.75-4.65H16.6v2.3h1.15a3.9 3.9 0 0 1 0 7.8H16.6v2.3h1.15A6.15 6.15 0 0 0 17.75 5.85Zm0 8.55a1.55 1.55 0 0 0 0-3.1H14.85v3.1h2.9Z"
        fill="#fff"
      />
    </svg>
  );
}

function SlackMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M8.1 14.55a1.65 1.65 0 1 1-1.65-1.65h1.65v1.65Z" fill="#E01E5A" />
      <path d="M8.95 14.55a1.65 1.65 0 1 1 3.3 0v4.15a1.65 1.65 0 1 1-3.3 0v-4.15Z" fill="#E01E5A" />
      <path d="M9.45 8.1A1.65 1.65 0 1 1 11.1 6.45V8.1H9.45Z" fill="#36C5F0" />
      <path d="M9.45 8.95a1.65 1.65 0 1 1 0 3.3H5.3a1.65 1.65 0 1 1 0-3.3h4.15Z" fill="#36C5F0" />
      <path d="M15.9 9.45A1.65 1.65 0 1 1 17.55 11.1H15.9V9.45Z" fill="#2EB67D" />
      <path d="M15.05 9.45a1.65 1.65 0 1 1-3.3 0V5.3a1.65 1.65 0 1 1 3.3 0v4.15Z" fill="#2EB67D" />
      <path d="M14.55 15.9A1.65 1.65 0 1 1 12.9 17.55V15.9h1.65Z" fill="#ECB22E" />
      <path d="M14.55 15.05a1.65 1.65 0 1 1 0-3.3h4.15a1.65 1.65 0 1 1 0 3.3h-4.15Z" fill="#ECB22E" />
    </svg>
  );
}

function DiscordMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#5865F2" />
      <path
        d="M17.6 7.55A13.2 13.2 0 0 0 14.95 6.8l-.2.4c1.05.25 1.75.65 2.35 1.1-1-.5-2.15-.85-3.4-1.05-.85-.15-1.7-.2-2.55-.15-.85-.05-1.7 0-2.55.15-1.25.2-2.4.55-3.4 1.05.6-.45 1.3-.85 2.35-1.1l-.2-.4A13.2 13.2 0 0 0 6.4 7.55c-1.85 2.75-2.35 5.45-2.1 8.1 1.1.8 2.15 1.3 3.15 1.6l.4-.7c-.4-.15-.8-.35-1.15-.55.25.15.5.3.8.4 1.1.5 2.25.8 3.45.8s2.35-.3 3.45-.8c.3-.1.55-.25.8-.4-.35.2-.75.4-1.15.55l.4.7c1-.3 2.05-.8 3.15-1.6.35-2.85-.25-5.55-2.1-8.1ZM9.85 13.9c-.65 0-1.2-.6-1.2-1.35s.55-1.35 1.2-1.35 1.2.6 1.2 1.35-.55 1.35-1.2 1.35Zm4.3 0c-.65 0-1.2-.6-1.2-1.35s.55-1.35 1.2-1.35 1.2.6 1.2 1.35-.55 1.35-1.2 1.35Z"
        fill="#fff"
      />
    </svg>
  );
}

function ZohoMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#E42527" />
      <path
        d="M6.4 8.2h7.1c1.85 0 3.15 1.1 3.15 2.85 0 1.55-.95 2.55-2.45 2.85l2.75 3.9H14.4l-2.45-3.55H9.15V17.8H6.4V8.2Zm2.75 2.05v2.85h3.35c.9 0 1.45-.45 1.45-1.4s-.55-1.45-1.45-1.45H9.15Z"
        fill="#fff"
      />
    </svg>
  );
}

function SalesforceMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M10.1 6.4c.7-.7 1.65-1.1 2.7-1.1 1.15 0 2.15.5 2.85 1.25.7-.35 1.45-.55 2.25-.55 2.35 0 4.25 1.85 4.25 4.15 0 .2 0 .4-.05.6 1.15.55 1.95 1.7 1.95 3.05 0 1.9-1.55 3.4-3.45 3.4-.35 0-.7-.05-1-.15-.55.95-1.6 1.55-2.8 1.55-.7 0-1.35-.2-1.9-.55-.6 1.15-1.8 1.9-3.2 1.9-1.15 0-2.15-.5-2.85-1.3-.55.25-1.15.4-1.8.4-2.1 0-3.8-1.65-3.8-3.7 0-1.15.55-2.2 1.4-2.9C4.3 10.1 4 9.3 4 8.4c0-2.05 1.7-3.7 3.8-3.7.85 0 1.65.25 2.3.7Z"
        fill="#00A1E0"
      />
    </svg>
  );
}

function HubSpotMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#FF7A59" />
      <circle cx="16.4" cy="7.6" r="1.55" fill="#fff" />
      <path
        d="M10.9 10.2V8.35c.55-.2.95-.7.95-1.3 0-.8-.65-1.45-1.45-1.45S8.95 6.25 8.95 7.05c0 .6.4 1.1.95 1.3v1.85c-1.7.45-2.95 2-2.95 3.85 0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.85-1.25-3.4-2.95-3.85Zm-.55 6.25c-1.3 0-2.35-1.05-2.35-2.35S9.05 11.75 10.35 11.75s2.35 1.05 2.35 2.35-1.05 2.35-2.35 2.35Z"
        fill="#fff"
      />
      <path d="M14.85 12.55c.55.7.9 1.55.9 2.5 0 .35-.05.7-.1 1.05 1.05-.15 1.9-.95 2.15-1.95l-2.95-1.6Z" fill="#fff" />
    </svg>
  );
}

const INTEGRATIONS = [
  { name: 'Microsoft Teams', Logo: TeamsMark, label: 'Microsoft Teams' },
  { name: 'Google Workspace', Logo: GoogleWorkspaceMark, label: 'Google Workspace' },
  { name: 'Outlook', Logo: OutlookMark, label: 'Outlook' },
  { name: 'QuickBooks', Logo: QuickBooksMark, label: 'QuickBooks' },
  { name: 'Slack', Logo: SlackMark, label: 'Slack' },
  { name: 'Discord', Logo: DiscordMark, label: 'Discord' },
  { name: 'Zoho', Logo: ZohoMark, label: 'Zoho' },
  { name: 'Salesforce', Logo: SalesforceMark, label: 'Salesforce' },
  { name: 'HubSpot', Logo: HubSpotMark, label: 'HubSpot' },
];

function LogoItem({ name, Logo, label }) {
  return (
    <div
      className="group flex shrink-0 items-center gap-4 opacity-55 grayscale transition-all duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0"
      title={name}
    >
      <Logo className="h-12 w-12 shrink-0 sm:h-14 sm:w-14 md:h-16 md:w-16" />
      <span className="whitespace-nowrap text-lg font-semibold tracking-[-0.015em] text-[#0F172A] sm:text-xl md:text-2xl">
        {label}
      </span>
    </div>
  );
}

export function IntegrationLogoBar() {
  const loop = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <section
      id="company"
      aria-label="Integration partners"
      data-section="Integration Logo Bar"
      className="relative overflow-hidden bg-[#F8FCFD] px-0 py-12 sm:py-14"
    >
      <style>{`
        @keyframes hadir-integration-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,188,255,0.08),transparent_32%),radial-gradient(circle_at_80%_100%,rgba(0,178,238,0.06),transparent_34%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-[21rem] text-center font-display text-[10px] font-bold leading-[1.5] uppercase tracking-[0.13em] text-[#00bcff] sm:max-w-xl sm:text-[11px] sm:tracking-[0.16em] md:text-xs md:tracking-[0.18em]">
          Integrates seamlessly with your existing enterprise stack
        </p>
      </div>

      <div className="relative z-10 mt-10 overflow-hidden sm:mt-12">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#F8FCFD] to-transparent sm:w-28" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#F8FCFD] to-transparent sm:w-28" aria-hidden />

        <div className="flex w-max items-center gap-16 py-3 [animation:hadir-integration-marquee_55s_linear_infinite] hover:[animation-play-state:paused] sm:gap-20 sm:py-4 md:gap-24">
          {loop.map(({ name, Logo, label }, index) => (
            <LogoItem key={`${name}-${index}`} name={name} Logo={Logo} label={label} />
          ))}
        </div>
      </div>
    </section>
  );
}
