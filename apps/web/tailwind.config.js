/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
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
        ink: '#111827',
        canvas: '#F8FBFC',
        charcoal: {
          DEFAULT: '#0D0F12',
          card: '#1A1D21',
          line: '#2A2E35',
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          raised: 'rgba(255,255,255,0.10)',
          muted: 'rgba(255,255,255,0.04)',
        },
      },
      borderRadius: {
        card: '1rem',
        input: '0.625rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(1, 72, 113, 0.18)',
        'glass-lg': '0 12px 40px rgba(1, 72, 113, 0.22)',
        glow: '0 0 0 1px rgba(160, 235, 207, 0.18), 0 8px 24px rgba(1, 72, 113, 0.25)',
      },
      spacing: {
        page: '1.5rem',
        section: '1.25rem',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
