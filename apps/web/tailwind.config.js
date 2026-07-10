/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a',
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.10)',
          raised: 'rgba(255,255,255,0.14)',
          muted: 'rgba(255,255,255,0.06)',
        },
      },
      borderRadius: {
        card: '1rem',
        input: '0.625rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.25)',
        'glass-lg': '0 12px 40px rgba(15, 23, 42, 0.35)',
        glow: '0 0 0 1px rgba(59, 130, 246, 0.2), 0 8px 24px rgba(37, 99, 235, 0.22)',
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
