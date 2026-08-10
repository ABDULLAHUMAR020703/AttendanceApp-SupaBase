/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      /*
       * Semantic type ramp. Each step ships its own line height and optical
       * tracking, following Apple's rule that tracking tightens as type grows and
       * opens up as it shrinks — so `text-title` and `text-caption` stay balanced
       * without per-component tuning. Sizes are fixed px, not rem, because the
       * admin chrome is a dense fixed-density UI rather than flowing documents.
       */
      fontSize: {
        display: ['34px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        title: ['26px', { lineHeight: '1.18', letterSpacing: '-0.022em' }],
        'title-lg': ['30px', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
        heading: ['20px', { lineHeight: '1.25', letterSpacing: '-0.016em' }],
        subheading: ['16px', { lineHeight: '1.3', letterSpacing: '-0.012em' }],
        body: ['14px', { lineHeight: '1.55', letterSpacing: '-0.005em' }],
        'body-tight': ['14px', { lineHeight: '1.35', letterSpacing: '-0.005em' }],
        label: ['13px', { lineHeight: '1.35', letterSpacing: '0' }],
        caption: ['12px', { lineHeight: '1.45', letterSpacing: '0.004em' }],
        micro: ['11px', { lineHeight: '1.4', letterSpacing: '0.008em' }],
        metric: ['30px', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'metric-sm': ['22px', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },
      colors: {
        /*
         * Brand ramp — Deep Sky Blue (Hadir system).
         *
         *   TIER 3  400 #70C9EF  Sky Blue — icons, soft accents, secondary fills
         *   TIER 2  600 #00B2EE  Vivid Cyan — primary CTAs, active bars, focus
         *   Soft hover surface: sky.tint #E6F4FA
         *   Deep steps (700–900) only for pressed fills / chart rank — never body text.
         */
        accent: {
          50: '#F0FBFE',
          100: '#E0F6FC',
          200: '#C2ECF9',
          300: '#9ADDF4',
          400: '#70C9EF',
          500: '#3ABCEF',
          600: '#00B2EE',
          700: '#0090C4',
          800: '#0075A3',
          900: '#005A7A',
        },
        /* Soft hover wash — use as `bg-sky-soft` / arbitrary `#E6F4FA` in @apply. */
        'sky-soft': '#E0F6FC',
        'sky-tint': '#E6F4FA',
        /* Named secondary accent for explicit Sky Blue usage. */
        sky: {
          DEFAULT: '#70C9EF',
          soft: '#E0F6FC',
          tint: '#E6F4FA',
          ink: '#00B2EE',
        },
        /*
         * Logo signal — the electric lime dot on the Hadir.ai mark (`h.`).
         * Reserved for live presence: on-site dots, checked-in rings, notification
         * counts, and high-priority success pills. Not a substitute for cyan CTAs.
         */
        lime: {
          DEFAULT: '#84CC16',
          soft: '#F7FEE7',
          muted: '#D9F99D',
          ink: '#3F6212',
          bright: '#97E02C',
        },
        /*
         * Surface ladder. Five layers of cyan-tinted neutral.
         */
        surface: {
          canvas: '#F8FCFD',
          DEFAULT: '#FFFFFF',
          subtle: '#F5FBFD',
          muted: '#EAF6FB',
          sunken: '#DCEFF7',
        },
        hairline: {
          soft: '#EEF8FC',
          DEFAULT: '#DCEFF7',
          strong: '#B8DFF0',
        },
        success: {
          surface: '#F7FEE7',
          border: '#D9F99D',
          ink: '#3F6212',
          solid: '#84CC16',
        },
        warning: {
          surface: '#FEF7EA',
          border: '#F3DFB4',
          ink: '#B45309',
          solid: '#F59E0B',
        },
        danger: {
          surface: '#FDF2F2',
          border: '#F3CFCF',
          ink: '#B91C1C',
          solid: '#EF4444',
        },
        /* Active nav tab / page canvas — matches --page. */
        page: '#F8FCFD',
        /*
         * Legacy `brand.*` aliases remapped onto the Cyan system so any leftover
         * `bg-brand-*` / `text-brand-*` cannot resurrect the old #014871 navy.
         */
        brand: {
          50: '#F0FBFE',
          100: '#E0F6FC',
          200: '#C2ECF9',
          300: '#9ADDF4',
          400: '#70C9EF',
          500: '#3ABCEF',
          600: '#00B2EE',
          700: '#0090C4',
          800: '#0075A3',
          900: '#005A7A',
          950: '#0F172A',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
          faint: '#94A3B8',
        },
        charcoal: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          line: '#334155',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          raised: 'rgba(255,255,255,0.10)',
          muted: 'rgba(255,255,255,0.04)',
        },
      },
      borderRadius: {
        card: '1.25rem',
        input: '0.75rem',
        control: '0.875rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 191, 255, 0.14)',
        'glass-lg': '0 12px 40px rgba(0, 191, 255, 0.18)',
        glow: '0 0 0 1px rgba(112, 201, 239, 0.28), 0 8px 24px rgba(0, 191, 255, 0.22)',
        focus: '0 0 0 3px rgba(0, 191, 255, 0.25)',
        /*
         * Four-level elevation ramp — cyan-cool depth on ice canvas.
         * hair = resting card, raise = hover, pop = dropdown, overlay = modal.
         */
        hair: '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(0, 191, 255, 0.04)',
        raise: '0 2px 6px rgba(15, 23, 42, 0.05), 0 10px 24px rgba(0, 191, 255, 0.08)',
        pop: '0 4px 10px rgba(15, 23, 42, 0.06), 0 16px 36px rgba(0, 191, 255, 0.12)',
        overlay: '0 8px 20px rgba(15, 23, 42, 0.08), 0 32px 72px rgba(15, 23, 42, 0.14)',
      },
      spacing: {
        page: '1.5rem',
        section: '1.25rem',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      /*
       * One curve for the whole product: a decisive ease-out that leaves immediately
       * and settles slowly. `premium` is the historical name and `out` overrides
       * Tailwind's default so both class names resolve to the same motion.
       */
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.32, 0.72, 0, 1)',
        out: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      /* Interactive motion lives in 180-220ms; anything longer reads as lag. */
      transitionDuration: {
        fast: '180ms',
        DEFAULT: '200ms',
        slow: '220ms',
      },
    },
  },
  plugins: [],
};
