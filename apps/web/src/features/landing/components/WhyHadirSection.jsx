import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Mail, MapPin, MessageSquare } from 'lucide-react';
import { DarkMotionCard, FadeIn, springSoft } from './motion';

function DockIcon({ children, active = false, onClick, label }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors',
        active
          ? 'border-[#00BFFF]/35 bg-[#E0F6FC] text-[#00BFFF]'
          : 'border-[#DCEFF7] bg-[#F8FCFD] text-[#64748B] hover:text-[#00BFFF]',
      ].join(' ')}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={springSoft}
    >
      {active && (
        <motion.span
          layoutId="dockActive"
          className="absolute inset-0 rounded-2xl"
          style={{
            boxShadow: '0 0 0 1px rgba(0,191,255,0.25), 0 12px 30px rgba(0,136,199,0.18)',
          }}
          transition={springSoft}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

/** Large dark dock card — Chat / Attendance / Mail */
function TripleDockCard() {
  const [active, setActive] = useState('clock');

  return (
    <FadeIn className="mt-12 sm:mt-14">
      <DarkMotionCard className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(0,191,255,0.10) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-50"
          style={{
            background: 'linear-gradient(to top, rgba(0,191,255,0.14), transparent)',
          }}
          aria-hidden
        />

        <div className="relative flex flex-col items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <DockIcon
              label="Chat"
              active={active === 'chat'}
              onClick={() => setActive('chat')}
            >
              <MessageSquare className="h-6 w-6" strokeWidth={1.6} />
            </DockIcon>
            <DockIcon
              label="Attendance"
              active={active === 'clock'}
              onClick={() => setActive('clock')}
            >
              <Clock className="h-6 w-6" strokeWidth={1.6} />
            </DockIcon>
            <DockIcon
              label="Mail"
              active={active === 'mail'}
              onClick={() => setActive('mail')}
            >
              <Mail className="h-6 w-6" strokeWidth={1.6} />
            </DockIcon>
          </div>

          {/* Minimal timeline scale */}
          <div className="relative mt-10 h-px w-full max-w-sm bg-[#DCEFF7]">
            <span
              className="absolute left-[16%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
              style={{ background: 'linear-gradient(135deg, #00BFFF, #70C9EF)' }}
            />
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00BFFF]/50" />
            <span className="absolute right-[16%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#00BFFF]/25" />
          </div>
          <p className="mt-4 text-center text-xs tracking-wide text-[#64748B]">
            Chat · Attendance · Mail — one dock, zero clutter
          </p>
        </div>
      </DarkMotionCard>
    </FadeIn>
  );
}

function WeeklyAttendanceGrid() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Present / leave / remote-ish pattern
  const cells = [
    1, 1, 1, 1, 1, 0, 0,
    1, 1, 2, 1, 1, 0, 0,
    1, 1, 1, 1, 3, 0, 0,
    1, 2, 1, 1, 1, 0, 0,
    1, 1, 1, 3, 1, 0, 0,
  ];

  const tone = (v) => {
    if (v === 1) return { background: 'linear-gradient(135deg, #00BFFF, #70C9EF)' };
    if (v === 2) return { background: '#F59E0B' };
    if (v === 3) return { background: '#00BFFF' };
    return { background: '#DCEFF7' };
  };

  return (
    <DarkMotionCard className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#0F172A]">Weekly attendance</p>
          <p className="mt-0.5 text-xs text-[#64748B]">Auto-synced from check-ins</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00BFFF]/20 bg-[#E0F6FC] px-2.5 py-1 text-[11px] text-[#00BFFF]">
          <MapPin className="h-3 w-3" />
          On site
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium text-[#64748B]">
        {days.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {cells.map((v, i) => (
          <motion.span
            key={i}
            className="mx-auto h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3"
            style={tone(v)}
            whileHover={{ scale: 1.35 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-[#64748B]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'linear-gradient(135deg, #00BFFF, #70C9EF)' }} />
          Present
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#00BFFF]" />
          Remote
        </span>
      </div>
    </DarkMotionCard>
  );
}

function SplineMetricsChart() {
  return (
    <DarkMotionCard className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[#0F172A]">Team presence</p>
        <p className="text-xs text-[#64748B]">Last 30 days</p>
      </div>
      <div
        className="relative h-52 overflow-hidden rounded-xl border border-[#DCEFF7] bg-[#F8FCFD] sm:h-56"
        style={{
          backgroundImage: 'radial-gradient(rgba(0,191,255,0.10) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="waveFillA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveFillB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveFillC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Soft horizontal guides */}
          {[50, 90, 130, 170].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="400"
              y2={y}
              stroke="rgba(15,23,42,0.06)"
              strokeWidth="1"
            />
          ))}

          {/* Multi-layer smoothed splines */}
          <path
            d="M0,150 C35,145 70,160 105,130 C140,100 175,125 210,105 C245,85 280,115 315,95 C350,75 375,90 400,78 L400,200 L0,200 Z"
            fill="url(#waveFillB)"
          />
          <path
            d="M0,130 C40,120 75,145 110,115 C145,85 180,110 215,95 C250,80 285,100 320,82 C355,64 380,78 400,60 L400,200 L0,200 Z"
            fill="url(#waveFillC)"
          />
          <path
            d="M0,110 C45,100 80,85 120,98 C160,111 195,70 235,82 C275,94 310,58 345,68 C370,74 385,55 400,52 L400,200 L0,200 Z"
            fill="url(#waveFillA)"
          />

          {/* Stroke curves for definition */}
          <path
            d="M0,110 C45,100 80,85 120,98 C160,111 195,70 235,82 C275,94 310,58 345,68 C370,74 385,55 400,52"
            fill="none"
            stroke="#00BFFF"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
          <path
            d="M0,130 C40,120 75,145 110,115 C145,85 180,110 215,95 C250,80 285,100 320,82 C355,64 380,78 400,60"
            fill="none"
            stroke="#00BFFF"
            strokeOpacity="0.45"
            strokeWidth="1.25"
          />

          {/* Indicator */}
          <line x1="248" y1="28" x2="248" y2="175" stroke="rgba(0,136,199,0.45)" strokeWidth="1.5" />
          <circle cx="248" cy="84" r="4.5" fill="#00BFFF" />
          <circle cx="248" cy="98" r="4.5" fill="#00BFFF" />
          <circle cx="248" cy="112" r="4.5" fill="#00BFFF" />
        </svg>
      </div>
    </DarkMotionCard>
  );
}

/**
 * Section 2 — WHY HADIR?
 * Continuous light canvas with three feature blocks.
 */
export function WhyHadirSection() {
  return (
    <section id="why-hadir" className="relative bg-[#F8FCFD]">
      {/* Soft seam from hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#E0F6FC]/60 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        {/* ── Block 1: Header + Triple Dock ── */}
        <FadeIn>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00BFFF]">
            Why Hadir?
          </p>
        </FadeIn>

        <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-start md:gap-12">
          <FadeIn>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Keep your workflow, ditch the paperwork.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-base leading-relaxed text-[#64748B] md:pt-2">
              Hadir.ai plugs into how your team already works — automating check-ins, leave
              approvals, and operational reporting so managers stay in flow, not in inboxes.
            </p>
          </FadeIn>
        </div>

        <TripleDockCard />
      </div>

      {/* ── Block 2: Calendar / Automation ── */}
      <div id="features" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <FadeIn>
            <WeeklyAttendanceGrid />
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
              Use it less, automate the rest.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#64748B]">
              Configure geofencing, work modes, and leave rules once. Hadir.ai handles the daily
              rhythm — reminders, status, and exceptions — so attendance runs quietly in the
              background.
            </p>
          </FadeIn>
        </div>
      </div>

      {/* ── Block 3: Analytics Curve ── */}
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <FadeIn>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
              Impactful decisions, based on team metrics.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#64748B]">
              Boost productivity and prevent burnout with clear attendance trends, leave load, and
              headcount signals. Know when to accelerate — and when to ease off.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <SplineMetricsChart />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
