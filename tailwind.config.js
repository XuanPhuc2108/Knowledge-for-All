/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0C0C0C',
        'dark-secondary': '#141414',
        cream: '#1A1814',
        glass: 'rgba(255,255,255,0.12)',
        'text-primary': '#F7F2E8',
        'text-muted': '#A8A29E',
        'accent-yellow': '#FBBF24',
        'accent-orange': '#F97316',
        'accent-rose': '#FB7185',
        'accent-purple': '#8B5CF6',
        'accent-blue': '#3B82F6',
        'accent-teal': '#2DD4BF',
        'accent-lime': '#A3E635',
        brand: {
          dark: '#0C0C0C',
          darkSoft: '#141414',
          text: '#F7F2E8',
          muted: '#A8A29E',
          gold: '#FFD84D',
        },
      },
      borderRadius: {
        card: '1.25rem',
        'card-lg': '1.75rem',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Kanit"', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.02em',
        widest: '0.2em',
      },
      transitionTimingFunction: {
        awwwards: 'cubic-bezier(0.25, 1, 0.5, 1)',
        magnetic: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      animation: {
        'text-glow': 'pulseGlow 4s ease-in-out infinite',
        shine: 'shine 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        shine: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      backgroundImage: {
        'hero-mesh':
          'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(251,191,36,0.15), transparent), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.12), transparent), radial-gradient(ellipse 50% 50% at 50% 80%, rgba(45,212,191,0.1), transparent)',
      },
    },
  },
  plugins: [],
}
