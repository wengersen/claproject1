import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF8F3',
          100: '#FFEEDD',
          200: '#FFD9B5',
          300: '#FFB87A',
          400: '#FF9240',
          500: '#E8721A',
          600: '#C45C0A',
          700: '#9A4208',
        },
        neutral: {
          0:   '#FFFFFF',
          50:  '#FAFAF8',
          100: '#F4F3F0',
          200: '#E8E6E1',
          300: '#D1CEC7',
          400: '#A8A49C',
          500: '#78746C',
          600: '#4A4641',
          700: '#2E2B27',
          800: '#1A1815',
          900: '#0D0C0A',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter:  ['Inter', 'sans-serif'],
      },
      animation: {
        'paw-pulse': 'pawPulse 1.5s ease-in-out infinite',
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
      },
      keyframes: {
        pawPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.95)' },
          '50%':      { opacity: '1',   transform: 'scale(1.05)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
