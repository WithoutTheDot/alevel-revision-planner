/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-bg':       'rgb(var(--brand-bg) / <alpha-value>)',
        'brand-surface':  'rgb(var(--brand-surface) / <alpha-value>)',
        'brand-border':   'rgb(var(--brand-border) / <alpha-value>)',
        'brand-amber':    'rgb(var(--brand-accent) / <alpha-value>)',
        'brand-amber-dim':'rgb(var(--brand-accent-dim) / <alpha-value>)',
        'brand-text':     'rgb(var(--brand-text) / <alpha-value>)',
        'brand-muted':    'rgb(var(--brand-muted) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['DM Sans',       'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'orb-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%':      { transform: 'translate(-20px, 10px) scale(0.95)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'float':     'float 5s ease-in-out infinite',
        'orb-drift': 'orb-drift 18s ease-in-out infinite',
        'count-up':  'count-up 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
