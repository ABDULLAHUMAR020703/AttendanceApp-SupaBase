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
         * Brand ramp — one hue, ten steps, three of which are a documented tier.
         *
         * The product's colour hierarchy is expressed by depth rather than by adding
         * hues, so a reader ranks two elements by how dark their teal is:
         *
         *   TIER 3  400 #4DD0E1  light  — supporting data bars, subtle highlights,
         *                                 active toggle fills, soft borders. Carries
         *                                 no text: this step is a fill, not a surface.
         *   TIER 2  600 #0097A7  brand  — the identity colour. Solid action fills,
         *                                 active menu accents, key callouts, icons,
         *                                 borders, display type on white.
         *   TIER 1  800 #006978  deep   — hero stats, top-rank bars, dark badges,
         *                                 high-emphasis headers, filled hover.
         *
         * The two steps under a label carry a hard contrast rule, because they are
         * where a wrong pick becomes unreadable rather than merely off-brand:
         *   700 #00838F  darkest-safe filled surface for white text (4.6:1), and the
         *                lightest teal permitted AS small text on white.
         *   800 #006978  filled hover / pressed (6.4:1 under white).
         * White on 600 is 3.5:1, so tier 2 fills a shape but never sits under a
         * label. 50-300 are tint surfaces; 500 is decorative only.
         */
        accent: {
          50: '#F2FCFD',
          100: '#E6F7F9',
          200: '#C7EFF5',
          300: '#8FE3EE',
          400: '#4DD0E1',
          500: '#18C9D8',
          600: '#0097A7',
          700: '#00838F',
          800: '#006978',
          900: '#005A66',
        },
        /*
         * Logo signal — the electric lime dot on the Hadir.ai mark (`h.`).
         * Reserved for live presence: on-site dots, checked-in rings, notification
         * counts, and high-priority success pills. Not a substitute for teal CTAs.
         */
        lime: {
          DEFAULT: '#84CC16',
          soft: '#F7FEE7',
          muted: '#D9F99D',
          ink: '#3F6212',
          bright: '#97E02C',
        },
        /*
         * Surface ladder. Five layers of cyan-tinted neutral, each a measured step
         * away from white, so depth comes from stacking flat surfaces rather than
         * from gradients. The tint is 3-11% and stays on the cyan hue, which is what
         * keeps the portal from reading as flat white or as dull grey.
         *
         *   canvas  the page behind everything — ice-white, so cards separate from it
         *           on their border and shadow rather than on a tonal step
         *   DEFAULT card / primary content
         *   subtle  inset panel nested inside a card
         *   muted   secondary chrome: table heads, toolbars, segment tracks
         *   sunken  wells that something fills: progress tracks, empty bars
         */
        surface: {
          canvas: '#F8FDFC',
          DEFAULT: '#FFFFFF',
          subtle: '#F6FAFC',
          muted: '#EDF4F7',
          sunken: '#E3EDF2',
        },
        /*
         * Border ladder. One weight was doing every job, which left nested panels
         * either invisible or over-drawn. Borders are cooler than the fill they sit
         * on, so edges read as light catching an edge instead of as grey lines.
         */
        hairline: {
          soft: '#EEF8F9',
          DEFAULT: '#E2F3F5',
          strong: '#CBE6EA',
        },
        /*
         * Semantic triads. Every state gets a surface, a border and an ink, so status
         * is never communicated by a saturated fill. Each `ink` clears WCAG AA on
         * both white and its own surface; `solid` is for dots and bars only, never
         * behind text.
         *
         * Success `solid` is the logo lime — present / on-site / live — so settled
         * attendance status matches the mark rather than a generic green.
         */
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
        /* Mirrors --page in index.css; also the active nav tab and its curve pieces. */
        page: '#F8FDFC',
        // Hadir brand — aligned with landing (#014871 → #A0EBCF)
        brand: {
          50: '#F0FAF7',
          100: '#D8F5EB',
          200: '#A0EBCF',
          300: '#6DD4B8',
          400: '#3BAF96',
          500: '#014871',
          600: '#013A5C',
          700: '#012C46',
          800: '#011E30',
          900: '#0D0F12',
          950: '#07090C',
        },
        /*
         * Text ramp. Deliberately only two tiers that carry words: a third tier had
         * to sit around 4.6:1 on white, which then dropped to 3.9:1 once the same
         * text landed on `surface-sunken` — a tier that fails depending on which
         * layer it lands on is worse than no tier. Hierarchy is carried by size and
         * weight instead (see the type ramp above).
         *   ink        15.7:1 on white, 13.2:1 on the deepest surface
         *   ink-muted   5.9:1 on white,  5.0:1 on the deepest surface
         *   ink-faint  decorative only — ornaments and placeholders, never words
         */
        ink: {
          DEFAULT: '#1B2430',
          muted: '#55657B',
          faint: '#94A3B8',
        },
        /*
         * There is no bare `canvas` colour. It used to hold #F8FBFC — a grey-tinted
         * near-white a hair off the #F8FDFC the page and the active nav tab share, so
         * a single `bg-canvas` on a layout wrapper would have put two different whites
         * either side of the tab's cutout and drawn a seam down the rail. The page
         * canvas is `page` (or `surface-canvas`), and both are #F8FDFC.
         */
        charcoal: {
          DEFAULT: '#0D0F12',
          card: '#1A1D21',
          line: '#2A2E35',
        },
        /* Translucent whites for the dark landing sections only. */
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
        glass: '0 8px 32px rgba(1, 72, 113, 0.18)',
        'glass-lg': '0 12px 40px rgba(1, 72, 113, 0.22)',
        glow: '0 0 0 1px rgba(160, 235, 207, 0.18), 0 8px 24px rgba(1, 72, 113, 0.25)',
        /*
         * Four-level elevation ramp, all cool-tinted so shadows read as depth on a
         * cyan-white canvas rather than as grey haze.
         * hair = resting card, raise = hover, pop = dropdown, overlay = modal.
         */
        hair: '0 1px 2px rgba(13, 45, 58, 0.05), 0 2px 6px rgba(13, 45, 58, 0.035)',
        raise: '0 2px 6px rgba(13, 45, 58, 0.05), 0 10px 24px rgba(13, 45, 58, 0.075)',
        pop: '0 4px 10px rgba(13, 45, 58, 0.06), 0 16px 36px rgba(13, 45, 58, 0.12)',
        overlay: '0 8px 20px rgba(13, 45, 58, 0.10), 0 32px 72px rgba(13, 45, 58, 0.18)',
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
