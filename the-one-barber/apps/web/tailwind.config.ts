import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0B',
        coal: '#111114',
        smoke: '#17171C',
        line: '#26262C',
        gold: {
          DEFAULT: '#D4AF37',
          light: '#EACB6B',
          deep: '#9C7C1E',
        },
        // Per-dashboard accents — one brand family, four moods
        champagne: {
          light: '#F2E0AE',
          DEFAULT: '#E3C584',
          deep: '#B3955C',
        },
        steel: {
          light: '#C9D6E2',
          DEFAULT: '#9FB4C8',
          deep: '#6E8299',
        },
        bronze: {
          light: '#DCA96B',
          DEFAULT: '#C2803D',
          deep: '#8F5B26',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.25), 0 8px 30px rgba(212,175,55,0.12)',
        lift: '0 12px 40px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
