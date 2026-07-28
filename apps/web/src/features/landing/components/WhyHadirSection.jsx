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
          ? 'border-[#A0EBCF]/35 bg-[#121417] text-[#A0EBCF]'
          : 'border-[#2A2E35] bg-[#121417] text-[#9CA3AF] hover:text-white',
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
            boxShadow: '0 0 0 1px rgba(160,235,207,0.25), 0 12px 30px rgba(1,72,113,0.35)',
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
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-50"
          style={{
            background: 'linear-gradient(to top, rgba(1,72,113,0.25), transparent)',
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
          <div className="relative mt-10 h-px w-full max-w-sm bg-[#2A2E35]">
            <span
              className="absolute left-[16%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
              style={{ background: 'linear-gradient(135deg, #014871, #A0EBCF)' }}
            />
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
            <span className="absolute right-[16%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white/35" />
          </div>
          <p className="mt-4 text-center text-xs tracking-wide text-[#6B7280]">
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
    if (v === 1) return { background: 'linear-gradient(135deg, #014871, #A0EBCF)' };
    if (v === 2) return { background: '#F59E0B' };
    if (v === 3) return { background: '#60A5FA' };
    return { background: '#2A2E35' };
  };

  return (
    <DarkMotionCard className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Weekly attendance</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">Auto-synced from check-ins</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2E35] bg-[#121417] px-2.5 py-1 text-[11px] text-[#A0EBCF]">
          <MapPin className="h-3 w-3" />
          On site
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium text-[#6B7280]">
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

      <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-[#6B7280]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'linear-gradient(135deg, #014871, #A0EBCF)' }} />
          Present
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
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
        <p className="text-sm font-medium text-white">Team presence</p>
        <p className="text-xs text-[#6B7280]">Last 30 days</p>
      </div>
      <div
        className="relative h-52 overflow-hidden rounded-xl border border-[#2A2E35]/80 bg-[#121417] sm:h-56"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      >
        <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="waveFillA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A0EBCF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#A0EBCF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveFillB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#014871" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#014871" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveFillC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5BA8C8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#5BA8C8" stopOpacity="0" />
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
              stroke="rgba(255,255,255,0.04)"
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
            stroke="#A0EBCF"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
          <path
            d="M0,130 C40,120 75,145 110,115 C145,85 180,110 215,95 C250,80 285,100 320,82 C355,64 380,78 400,60"
            fill="none"
            stroke="#5BA8C8"
            strokeOpacity="0.45"
            strokeWidth="1.25"
          />

          {/* Indicator */}
          <line x1="248" y1="28" x2="248" y2="175" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <circle cx="248" cy="84" r="4.5" fill="#fff" />
          <circle cx="248" cy="98" r="4.5" fill="#fff" />
          <circle cx="248" cy="112" r="4.5" fill="#fff" />
        </svg>
      </div>
    </DarkMotionCard>
  );
}

/**
 * Section 2 — WHY HADIR?
 * Continuous dark charcoal canvas with three feature blocks.
 */
export function WhyHadirSection() {
  return (
    <section id="why-hadir" className="relative bg-[#0D0F12]">
      {/* Soft light→dark seam from hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F8FBFC]/08 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        {/* ── Block 1: Header + Triple Dock ── */}
        <FadeIn>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
            Why Hadir?
          </p>
        </FadeIn>

        <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-start md:gap-12">
          <FadeIn>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Keep your workflow, ditch the paperwork.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-base leading-relaxed text-[#9CA3AF] md:pt-2">
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
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Use it less, automate the rest.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#9CA3AF]">
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
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Impactful decisions, based on team metrics.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#9CA3AF]">
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
