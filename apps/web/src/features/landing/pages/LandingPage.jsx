import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Clock3,
  DatabaseZap,
  Fingerprint,
  Gauge,
  Globe2,
  KeyRound,
  Layers3,
  LockKeyhole,
  MapPin,
  Radar,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { HalftoneAura } from '../../../shared/components/HalftoneAura';
import { LandingNav } from '../components/LandingNav';
import { IntegrationLogoBar } from '../components/IntegrationLogoBar';
import { FeatureHighlightsChecklist } from '../components/FeatureHighlightsChecklist';
import { DEMO_BOOKING_URL, HeroCtaButton, LOGIN_PATH } from '../components/HeroCtaButton';

const spring = { type: 'spring', stiffness: 260, damping: 24, mass: 0.8 };
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] } },
};

const OVERVIEW_METRICS = [
  ['Active Employees', '1,284+'],
  ['Present Today', '94%'],
  ['Late Arrivals', '18'],
  ['Leave Requests', '42'],
  ['Workforce Health Score', '88%'],
];

const FEATURES = [
  ['AI Attendance', BrainCircuit, 'Recognizes attendance patterns, flags exceptions, and recommends next actions.', 'lg:col-span-2'],
  ['Geo Fencing', MapPin, 'Location-aware check-ins with site confidence and policy context.', ''],
  ['Shift Planning', CalendarClock, 'Create flexible schedules with automatic exception handling.', ''],
  ['Payroll Sync', DatabaseZap, 'Clean attendance data prepared for payroll and downstream systems.', 'lg:col-span-2'],
  ['Leave Management', Layers3, 'Balances, approvals, staffing impact, and calendars in one workflow.', ''],
  ['Biometric Integration', Fingerprint, 'Connect face, fingerprint, and device signals with audit trails.', ''],
  ['Live Monitoring', Radar, 'Real-time presence, alerts, and operational health across every site.', ''],
  ['Compliance Reports', BadgeCheck, 'Policy-ready reports for reviews, audits, and leadership updates.', ''],
];

const SECURITY = [
  ['Encryption', 'Enterprise-grade AES-256 data protection at rest and in transit across all attendance records.', '/assets/security-buyer-bg1.png'],
  ['Role Permissions', 'Granular access control keeping managers focused on their teams while securing sensitive personnel data.', '/assets/security-buyer-bg2.png'],
  ['Audit Logs', 'Traceable activity histories for every check-in, leave approval, and manual override across your enterprise.', '/assets/security-buyer-bg3.png'],
  ['Compliance Monitoring', 'Operational rules kept visible, reviewable, and aligned with local labor regulations automatically.', '/assets/security-buyer-bg4.png'],
];

function SecondaryButton({ children, href = '#product' }) {
  return (
    <a href={href} className="inline-flex items-center justify-center gap-2 rounded-[15px] border border-[#DCEFF7] bg-white/78 px-5 py-3 text-[15px] font-semibold text-[#0F172A] shadow-[0_8px_22px_rgba(15,23,42,0.04)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#00BFFF]/50 hover:bg-white hover:text-[#00BFFF] hover:shadow-[0_14px_30px_rgba(15,23,42,0.07)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]/35 focus-visible:ring-offset-4">
      {children}
    </a>
  );
}

function SlotNumber({ value }) {
  const ref = useRef(null);
  // Replay count-up whenever the metric re-enters the viewport (scroll up or down).
  const inView = useInView(ref, { once: false, amount: 0.4, margin: '-80px' });
  const characters = String(value).split('');

  return (
    <span ref={ref} className="inline-flex items-baseline overflow-hidden leading-none">
      {characters.map((char, index) => {
        if (!/\d/.test(char)) {
          return <span key={`${char}-${index}`} className="leading-none">{char}</span>;
        }

        const digit = Number(char);
        return (
          <span key={`${char}-${index}`} className="relative inline-block h-[1em] overflow-hidden leading-none">
            <motion.span
              className="flex flex-col leading-none"
              initial={{ y: '0em' }}
              animate={{ y: inView ? `-${digit}em` : '0em' }}
              transition={
                inView
                  ? { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }
                  : { duration: 0 }
              }
            >
              {Array.from({ length: 10 }, (_, number) => (
                <span key={number} className="block h-[1em] leading-none">{number}</span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

function DuotoneIcon({ icon: Icon, dark = false }) {
  return (
    <span className={`relative grid h-12 w-12 place-items-center rounded-[16px] border shadow-[0_8px_20px_rgba(15,23,42,0.04)] ${dark ? 'border-white/10 bg-white/8 text-[#E0F6FC]' : 'border-[#00BFFF]/25 bg-[#E0F6FC] text-[#00BFFF]'}`}>
      <span className="absolute inset-1 rounded-[0.9rem] bg-gradient-to-br from-white/65 to-transparent opacity-60" />
      <Icon className="relative h-5 w-5" strokeWidth={1.9} />
    </span>
  );
}

function ActivityPill({ children, className = '' }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border border-[#DCEFF7] bg-white/84 px-3 py-1.5 text-sm font-medium text-[#64748B] shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-xl ${className}`}>{children}</span>;
}

function StatusBadge({ children, tone = 'teal' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    teal: 'bg-[#E0F6FC] text-[#00BFFF] border-[#00BFFF]/20',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone] || tones.teal}`}>{children}</span>;
}

function DashboardMockup({ dark = false, compact = false }) {
  // The dark variant sits on #0088C7 so its white text stays above the 4.5:1 floor.
  const surface = dark ? 'border-white/10 bg-white/10 text-white shadow-[0_28px_80px_rgba(0,136,199,0.24)]' : 'border-[#DCEFF7] bg-white/86 text-[#0F172A] shadow-[0_28px_80px_rgba(15,23,42,0.10)]';
  const activity = [
    ['Ayesha Khan', 'Lahore HQ', '09:12', 'Checked in', 'emerald'],
    ['Hamza Tariq', 'Karachi Branch', '09:24', 'Shift overlap', 'amber'],
    ['Zainab Ahmed', 'Payroll Queue', '10:05', 'Sync ready', 'teal'],
  ];
  return (
    <motion.div className="relative" animate={{ y: [0, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} whileHover={{ y: -8 }}>
      <div className="absolute -inset-6 rounded-[2.25rem] bg-[#00BFFF]/14 blur-3xl" />
      <div className={`relative overflow-hidden rounded-[18px] border backdrop-blur-2xl ${surface}`}>
        <div className={`flex items-center justify-between border-b px-4 py-3 ${dark ? 'border-white/10 bg-white/8' : 'border-[#DCEFF7] bg-white/74'}`}>
          <div className="flex items-center gap-2" aria-hidden="true"><span className="h-3 w-3 rounded-full bg-[#FF5F57]" /><span className="h-3 w-3 rounded-full bg-[#FFBD2E]" /><span className="h-3 w-3 rounded-full bg-[#28C840]" /></div>
          <p className={`text-xs font-semibold ${dark ? 'text-white/70' : 'text-[#64748B]'}`}>Live Attendance Command Center</p>
          <span className={`hidden h-2 w-14 rounded-full sm:block ${dark ? 'bg-white/15' : 'bg-[#DCEFF7]'}`} />
        </div>
        <div className={`grid gap-4 p-4 sm:p-5 ${dark ? 'bg-[#00BFFF]/50' : 'bg-[#F8FCFD]/80'}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Total Present', '1,204', UserCheck, 'emerald'],
              ['Absent', '18', Users, 'amber'],
              ['Late', '42', Clock3, 'teal'],
            ].map(([label, value, Icon, tone]) => (
              <motion.div key={label} className={`rounded-[16px] border p-4 ${dark ? 'border-white/10 bg-white/8' : 'border-[#DCEFF7] bg-white/78'}`} whileHover={{ y: -4 }} transition={spring}>
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-[#00BFFF]" />
                  <StatusBadge tone={tone}>{label}</StatusBadge>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
              </motion.div>
            ))}
          </div>
          <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-[1.05fr_0.95fr]'}`}>
            <div className={`rounded-[16px] border p-4 ${dark ? 'border-white/10 bg-white/8' : 'border-[#DCEFF7] bg-white'}`}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Employee Presence Heatmap</p>
                <StatusBadge tone="emerald">Live</StatusBadge>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 28 }).map((_, i) => <span key={i} className="h-8 rounded-lg" style={{ backgroundColor: `rgba(0,191,255,${0.10 + ((i * 7) % 36) / 100})` }} />)}
              </div>
            </div>
            <div className={`space-y-3 rounded-[16px] border p-4 ${dark ? 'border-white/10 bg-white/8' : 'border-[#DCEFF7] bg-white'}`}>
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Live Activity Feed</p><StatusBadge>AI routed</StatusBadge></div>
              {activity.map(([name, location, time, status, tone]) => (
                <div key={`${name}-${status}`} className={`flex items-center gap-3 rounded-[14px] p-3 ${dark ? 'bg-white/8' : 'bg-[#F8FCFD]'}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00BFFF] shadow-[0_0_0_4px_rgba(0,191,255,0.16)]" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-semibold ${dark ? 'text-white/86' : 'text-[#0F172A]'}`}>{name}</p>
                    <p className={`truncate text-[11px] ${dark ? 'text-white/55' : 'text-[#64748B]'}`}>{location} · {time}</p>
                  </div>
                  <StatusBadge tone={tone}>{status}</StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.35 });
  const backgroundColor = useTransform(scrollYProgress, [0, 1], ['#22C55E', '#16A34A']);

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-50 h-[7px] origin-left shadow-[0_0_20px_rgba(34,197,94,0.38)]"
      style={{ scaleX, backgroundColor }}
      aria-hidden="true"
    />
  );
}

function Hero() {
  return (
    <section id="top" aria-label="Hero" data-section="Hero" className="relative min-h-[72vh] overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
      <HalftoneAura />
      <div className="relative z-10 mx-auto flex max-w-[980px] flex-col items-center text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <h1 className="text-[60px] font-bold leading-[0.98] tracking-[-0.02em] text-[#0F172A] sm:text-[68px] lg:text-[72px]">Automated <span className="text-[#00BFFF]">workforce intelligence</span> for enterprise teams.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-[1.6] text-[#64748B] sm:text-lg">Automate check-ins, enforce geofencing rules, track leave, and sync payroll without manual attendance cleanup.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <HeroCtaButton />
            <SecondaryButton href="#product">Explore Platform <ChevronRight className="h-4 w-4" /></SecondaryButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AttendanceOverview() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'center center'] });
  const metricsX = useTransform(scrollYProgress, [0, 1], [-100, 0]);
  const metricsOpacity = useTransform(scrollYProgress, [0, 0.65], [0.35, 1]);

  return (
    <section ref={sectionRef} id="product" aria-label="Product metrics" data-section="Product metrics" className="relative overflow-hidden px-4 pb-28 pt-20 sm:px-6 lg:px-8">
      <HalftoneAura />
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div className="max-w-3xl" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.35 }}>
          <h2 className="text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl">Live operations, summarized into decisions.</h2>
        </motion.div>
        <motion.div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-5" style={{ x: metricsX, opacity: metricsOpacity }}>
          {OVERVIEW_METRICS.map(([label, value], index) => (
            <motion.div
              key={label}
              className="pt-0"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.35 }}
              transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-4 h-[2px] w-full bg-[#00BFFF]/60" />
              <p className="text-4xl font-bold leading-none tracking-tight text-[#0F172A] md:text-5xl">
                <SlotNumber value={value} />
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AnalyticsShowcaseMockup() {
  const analyticsRows = [
    ['Ayesha K.', 'EMP001', 'P', 'A', 'P', 'P', 'P', 'L'],
    ['Hamza T.', 'EMP002', 'P', 'P', 'P', 'A', 'P', 'P'],
    ['Zainab A.', 'EMP003', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['Usman R.', 'EMP004', 'P', 'P', 'L', 'P', 'P', 'A'],
    ['Sara L.', 'EMP005', 'P', 'A', 'P', 'P', 'P', 'P'],
    ['Bilal M.', 'EMP006', 'P', 'P', 'P', 'P', 'L', 'P'],
  ];
  const exportRows = [
    ['Ayesha Khan', 'Engineering', 'Lahore HQ', 'Present', '09:02 AM', '06:21 PM'],
    ['Hamza Tariq', 'Operations', 'Karachi', 'Late', '09:31 AM', '06:15 PM'],
    ['Zainab Ahmed', 'Payroll', 'Lahore HQ', 'Leave', '-', '-'],
    ['Usman Raza', 'Engineering', 'Islamabad', 'Present', '09:25 AM', '06:30 PM'],
  ];
  const profileEvents = [
    ['Checked in at 10:04am', 'green'],
    ['Checked out at 05:25pm', 'green'],
    ['Checked in late at 10:15am', 'red'],
    ['Checked out at 06:01pm', 'green'],
  ];

  return (
    <motion.div className="relative min-h-[660px] lg:min-h-[700px]" animate={{ y: [0, -5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
      <div className="absolute -inset-8 rounded-[2.5rem] bg-white/10 blur-3xl" />

      <svg className="pointer-events-none absolute inset-0 z-30 hidden h-full w-full overflow-visible lg:block" viewBox="0 0 760 700" fill="none" aria-hidden="true">
        <g transform="translate(14 -64)">
          <path d="M510 86C474 94 454 112 444 142" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M438 130l5 16 13-11" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M710 268C736 304 734 346 704 386" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M717 376l-15 12-1-18" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M264 548C264 590 290 616 334 616" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M322 606l14 10-15 8" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="pointer-events-none absolute right-[4%] top-2 z-30 hidden w-[320px] text-white lg:block">
        <div className="text-center">
          <p className="text-base font-extrabold tracking-tight text-white">Attendance Analytics</p>
          <p className="mx-auto mt-1 max-w-[260px] text-sm font-medium leading-5 text-white/86">Track presence, absences, late arrivals, and trends.</p>
        </div>
        <div className="relative mt-8 h-24">
          <div className="absolute right-1 top-3 h-20 w-44 rounded-2xl border border-white/50 bg-white/55 shadow-[0_18px_50px_rgba(0,136,199,0.18)] blur-[1.5px]" />
          <div className="absolute right-6 top-7 text-sm font-extrabold text-[#00BFFF] blur-[0.4px]">Individual Profile</div>
          <div className="absolute left-0 top-0 flex items-center gap-2 rounded-2xl border border-white/55 bg-white/95 p-2 shadow-[0_18px_44px_rgba(0,136,199,0.18)] backdrop-blur-xl">
            {['Profiles', 'Present', 'Late', 'All'].map((tab) => (
              <span key={tab} className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold ${tab === 'Late' ? 'bg-[#00BFFF] text-white shadow-[0_8px_18px_rgba(0,191,255,0.22)]' : 'border border-[#DCEFF7] bg-white text-[#64748B]'}`}>{tab}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-[-3%] top-[34%] z-30 hidden max-w-[220px] text-sm leading-5 text-white lg:block">
        <p className="font-extrabold text-[#E0F6FC]">Individual Profile Attendance Report</p>
        <p className="mt-1 text-white/82">AI-powered insights and recommendations.</p>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-[32%] z-30 hidden max-w-[330px] text-sm leading-5 text-white lg:block">
        <p className="font-extrabold text-[#E0F6FC]">Download Profile, List, and Full Report</p>
        <p className="mt-1 text-white/82">Export data in Excel / CSV for payroll and compliance.</p>
      </div>

      <motion.div
        className="absolute left-[8%] top-[110px] z-10 w-[72%] origin-center overflow-hidden rounded-[22px] border border-white/70 bg-white/94 shadow-[0_34px_90px_rgba(0,136,199,0.30)] backdrop-blur-2xl lg:left-[6%] lg:w-[70%]"
        initial={{ opacity: 0, y: 24, rotateX: 8, rotateZ: 1.5 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0, rotateZ: 1.2 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between border-b border-[#DCEFF7] bg-gradient-to-b from-white to-[#F8FCFD] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#E0F6FC] text-[11px] font-black text-[#00BFFF]">A</span>
            <p className="text-xs font-extrabold text-[#64748B]">Analytics Breakdown</p>
          </div>
          <span className="rounded-full bg-[#E0F6FC] px-3 py-1 text-[10px] font-bold text-[#00BFFF]">Live filters</span>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#64748B]">75 records</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Synced</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#DCEFF7] bg-white">
            <div className="grid grid-cols-[1.4fr_0.9fr_repeat(6,0.55fr)] bg-[#00BFFF] px-3 py-2 text-[9px] font-bold text-white"><span>Name</span><span>Emp No.</span><span>07</span><span>08</span><span>09</span><span>10</span><span>11</span><span>12</span></div>
            {analyticsRows.map((row) => <div key={row[1]} className="grid grid-cols-[1.4fr_0.9fr_repeat(6,0.55fr)] border-t border-[#DCEFF7] px-3 py-2 text-[10px] font-semibold text-[#64748B]">{row.map((cell, i) => <span key={`${row[1]}-${i}`} className={cell === 'A' ? 'text-rose-500' : cell === 'L' ? 'text-amber-600' : ''}>{cell}</span>)}</div>)}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[120px] left-0 z-20 w-[66%] overflow-hidden rounded-[20px] border border-white/75 bg-white shadow-[0_32px_90px_rgba(0,136,199,0.34)] lg:w-[64%]"
        initial={{ opacity: 0, x: -28, y: 32, rotateZ: -1.5 }}
        whileInView={{ opacity: 1, x: 0, y: 0, rotateZ: -0.6 }}
        viewport={{ once: true }}
        transition={{ duration: 0.72, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between border-b border-[#DCEFF7] bg-[#F8FCFD] px-5 py-3">
          <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500 text-xs font-black text-white">S</span><p className="text-xs font-bold text-[#64748B]">Export_Present_Data.xlsx</p></div>
          <span className="rounded-full bg-[#E0F6FC] px-3 py-1 text-[10px] font-bold text-[#00BFFF]">100%</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-6 rounded-t-lg bg-[#F8FCFD] px-3 py-2 text-[9px] font-bold uppercase text-[#64748B]"><span>Name</span><span>Dept</span><span>Location</span><span>Status</span><span>In</span><span>Out</span></div>
          {exportRows.map((row) => <div key={row[0]} className="grid grid-cols-6 border-x border-b border-[#DCEFF7] px-3 py-2 text-[9px] font-semibold text-[#64748B]">{row.map((cell, i) => <span key={`${row[0]}-${i}`} className={`truncate ${cell === 'Present' ? 'rounded bg-emerald-50 px-1 text-emerald-700' : cell === 'Late' ? 'rounded bg-amber-50 px-1 text-amber-700' : cell === 'Absent' ? 'rounded bg-rose-50 px-1 text-rose-700' : ''}`}>{cell}</span>)}</div>)}
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[132px] right-0 z-30 w-[32%] min-w-[230px] rounded-[22px] border border-white/80 bg-white p-5 shadow-[0_36px_95px_rgba(0,136,199,0.36)]"
        initial={{ opacity: 0, x: 34, y: 18, rotateZ: 2 }}
        whileInView={{ opacity: 1, x: 0, y: 0, rotateZ: 1.6 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-[#00BFFF]">Individual Profile</p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#0F172A]">Attendance Report</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Ready</span>
        </div>
        <div className="mt-4 flex gap-2">
          {['Today', '7 Days', '30 Days'].map((tab) => <span key={tab} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${tab === 'Today' ? 'bg-[#00BFFF] text-white' : 'bg-[#E0F6FC] text-[#64748B]'}`}>{tab}</span>)}
        </div>
        <p className="mt-4 text-[10px] font-semibold leading-4 text-[#64748B]">Predicted absent records: 12 based on AI behavioral analysis.</p>
        <div className="mt-4 space-y-3">
          {profileEvents.map(([event, tone]) => <div key={event} className="flex gap-3 text-[10px] font-semibold leading-4 text-[#64748B]"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone === 'green' ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span>{event}<br /><span className="text-[#94A3B8]">Confidence: 97% High</span></span></div>)}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {['Print', 'PDF', 'Excel'].map((item) => <span key={item} className="rounded-lg border border-[#DCEFF7] bg-white px-2 py-2 text-[10px] font-bold text-[#64748B]">{item}</span>)}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductShowcase() {
  const stories = [
    ['Detailed Attendance Analytics & Reports', 'Export attendance logs, track daily and monthly breakdowns, and generate profile-level reports that help HR and operations teams close payroll with confidence.'],
  ];
  // Showcase band: solid cyan (#00bcff) with soft ambient glow + curved process path.
  return (
    <section id="solutions" aria-label="Product solutions" data-section="Product solutions" className="relative overflow-hidden bg-[#00bcff] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_48%,rgba(255,255,255,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(112,201,239,0.35),transparent_30%),linear-gradient(160deg,#00bcff_0%,#00B2EE_52%,#0096e0_100%)]" />
        <div className="absolute left-[18%] top-[20%] h-80 w-80 rounded-full bg-white/15 blur-[90px]" />
        <div className="absolute bottom-6 right-[22%] h-64 w-64 rounded-full bg-[#70C9EF]/30 blur-[80px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-[1400px] space-y-10 lg:space-y-14">
        {stories.map(([title, copy], index) => (
          <div key={title} className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <motion.div className={index % 2 ? 'lg:order-2' : ''} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
              <h2 className="max-w-xl text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">{title}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/78">{copy}</p>
            </motion.div>
            <AnalyticsShowcaseMockup />
          </div>
        ))}

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="rounded-2xl bg-white px-5 py-2 shadow-[0_12px_36px_rgba(0,80,140,0.12)] sm:px-8"
        >
          <FeatureHighlightsChecklist />
        </motion.div>
      </div>
    </section>
  );
}


function SecurityWave({ src }) {
  return (
    <div className="relative z-10 -mt-10 h-56 w-full overflow-hidden rounded-b-3xl">
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-bottom opacity-95 [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.72)_32%,#000_54%)] transition-all duration-[520ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.08] group-hover:opacity-100 group-hover:mix-blend-multiply group-hover:saturate-[1.65] group-hover:contrast-125"
        loading="lazy"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00BFFF]/20 to-[#00BFFF]/34 opacity-0 mix-blend-overlay transition-opacity duration-[520ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.24),transparent_26%),radial-gradient(circle_at_78%_78%,rgba(255,255,255,0.20),transparent_28%),linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.05)_42%,rgba(255,255,255,0.16)_100%)] opacity-0 transition-opacity duration-[520ms] group-hover:opacity-100" />
    </div>
  );
}

function Security() {
  return (
    <section id="security" aria-label="Enterprise Security" data-section="Enterprise Security" className="bg-gradient-to-b from-[#E0F6FC]/60 via-white to-[#F8FCFD] px-6 py-20">
      <div className="mx-auto max-w-[1400px]">
        <div>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">Built for buyers who ask hard questions.</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY.map(([title, copy, image], index) => (
            <motion.article
              key={title}
              className="group relative flex h-[420px] flex-col overflow-hidden rounded-[1.5rem] border border-[#DCEFF7] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1.5 hover:border-[#00BFFF]/50 hover:bg-[#00BFFF] hover:shadow-[0_26px_64px_rgba(0,191,255,0.30)]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#00BFFF] via-[#00BFFF] to-[#00A8E6] opacity-0 transition-opacity duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100" />
              <div className="relative z-10 flex flex-1 flex-col p-8">
                <h3 className="mb-3 font-display text-2xl font-bold leading-tight text-[#0F172A] transition-colors duration-[400ms] group-hover:text-white">{title}</h3>
                <p className="mb-8 font-sans text-sm font-normal leading-relaxed text-[#64748B] transition-colors duration-[400ms] group-hover:text-white">{copy}</p>
                <a href="#contact" className="mt-auto inline-flex items-center gap-1 text-[0.85rem] font-bold uppercase tracking-[0.05em] text-[#0F172A] transition-colors duration-[400ms] group-hover:text-white">
                  LEARN MORE <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
              <SecurityWave src={image} />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

const DEMO_CONTACT_EMAIL = 'demo@hadir.ai';

function ContactUsForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  const resetStatus = () => {
    if (status !== 'idle') setStatus('idle');
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedEmail || !trimmedMessage) {
      setStatus('error');
      return;
    }

    const fullName = `${trimmedFirst} ${trimmedLast}`;
    const subject = encodeURIComponent(`Hadir.ai contact — ${fullName}`);
    const body = encodeURIComponent(
      `Name: ${fullName}\nEmail: ${trimmedEmail}\n\nMessage:\n${trimmedMessage}`,
    );
    setStatus('sent');
    window.location.href = `mailto:${DEMO_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00bcff] focus:bg-white focus:ring-2 focus:ring-[#00bcff]/25';

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8"
    >
      <h2 className="text-2xl font-bold text-slate-900">Contact Us</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        We are deeply committed to delivering unparalleled service and unwavering support to ensure your experience exceeds expectations.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        A product by{' '}
        <a
          href="https://techdotglobal.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#008ec1] underline decoration-[#00bcff]/35 underline-offset-2 transition-colors hover:text-[#00bcff] focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#00bcff]/35"
        >
          TechDotGlobal
          <ArrowRight className="ml-1 inline-block h-3 w-3" aria-hidden />
        </a>
      </p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            First Name <span className="text-red-500">*</span>
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                resetStatus();
              }}
              placeholder="First name"
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Last Name <span className="text-red-500">*</span>
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                resetStatus();
              }}
              placeholder="Last name"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          Email <span className="text-red-500">*</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetStatus();
            }}
            placeholder="you@company.com"
            className={fieldClass}
          />
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          Description <span className="text-red-500">*</span>
          <textarea
            name="message"
            rows={4}
            required
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              resetStatus();
            }}
            placeholder="Message"
            className={`${fieldClass} resize-none`}
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-5 w-full rounded-xl bg-[#00bcff] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00a3e0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00bcff]/45 focus-visible:ring-offset-2"
      >
        Submit
      </button>

      {status === 'error' && (
        <p className="mt-2 text-xs font-medium text-red-600" role="alert">
          Please complete all required fields.
        </p>
      )}
      {status === 'sent' && (
        <p className="mt-2 text-xs font-medium text-emerald-600" role="status">
          Opening your email client…
        </p>
      )}
    </form>
  );
}

function FinalCTA() {
  return (
    <section
      id="contact"
      aria-label="Contact Us and Request Demo"
      data-section="Contact Us"
      className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8"
    >
      <HalftoneAura />
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <ContactUsForm />

        <div>
          <div className="rounded-2xl bg-[#00bcff] p-6 text-white shadow-[0_18px_40px_rgba(0,188,255,0.28)]">
            <h3 className="text-xl font-bold leading-snug text-white sm:text-2xl">
              See attendance automation operating live.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              Explore how AI attendance, geofencing, analytics, integrations, and enterprise controls work together.
            </p>
            <a
              href={DEMO_BOOKING_URL}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/45 bg-white px-6 py-3 text-sm font-bold tracking-[-0.01em] text-[#008ec1] shadow-[0_10px_24px_rgba(0,105,150,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F0FBFE] hover:shadow-[0_14px_30px_rgba(0,105,150,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#00bcff] active:translate-y-0 active:scale-[0.98]"
            >
              Book Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const columns = [
    ['Product', [['AI Attendance', '#product'], ['Dashboard', '#product'], ['Automation', '#solutions'], ['Analytics', '#product']]],
    ['Solutions', [['Enterprise HR', '#solutions'], ['Operations', '#solutions'], ['Hybrid Teams', '#solutions'], ['Compliance', '#security']]],
    ['Resources', [['Guides', '#product'], ['API Docs', '#contact'], ['Help Center', '#contact'], ['Security', '#security']]],
    ['Company', [['About', '#top'], ['Contact', '#contact'], ['Careers', '#contact'], ['Partners', '#company']]],
    ['Legal', [['Privacy', '#security'], ['Terms', '#security'], ['DPA', '#security'], ['Status', '#top']]],
  ];
  return (
    <footer className="border-t border-white/10 bg-black px-4 py-20 text-white/55 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {columns.map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <div className="mt-4 space-y-3">
                {links.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="block text-sm text-white/55 transition hover:text-[#00BFFF]"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-white">Hadir.ai</p>
          <p>© 2026 Hadir.ai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const onSignInClick = () => navigate(LOGIN_PATH);
  return (
    <div className="landing-page bg-[#F8FCFD] text-[#0F172A] antialiased [font-family:'Plus_Jakarta_Sans',Inter,system-ui,sans-serif]">
      <ScrollProgressBar />
      <LandingNav onSignInClick={onSignInClick} />
      <main>
        <Hero />
        <IntegrationLogoBar />
        <AttendanceOverview />
        <ProductShowcase />
        <Security />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
