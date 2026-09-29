/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: 'rgb(var(--color-dark) / <alpha-value>)',
        'dark-secondary': 'rgb(var(--color-dark-secondary) / <alpha-value>)',
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        glass: 'rgb(var(--color-glass) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
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
          'radial-gradient(ellipse 80% 50% at 18% 40%, rgba(251,191,36,0.13), transparent), radial-gradient(ellipse 60% 40% at 84% 18%, rgba(255,255,255,0.055), transparent), radial-gradient(ellipse 50% 50% at 52% 90%, rgba(251,191,36,0.045), transparent)',
      },
    },
  },
  plugins: [],
}
