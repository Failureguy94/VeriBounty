/** Colours are CSS variables (RGB channels) defined in src/index.css for the
 *  light and dark themes, so opacity modifiers like `bg-paper/80` still work. */
const v = name => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        surface: v('surface'),
        ink: {
          DEFAULT: v('ink'),
          2: v('ink-2'),
          3: v('ink-3'),
        },
        rule: {
          DEFAULT: v('rule'),
          strong: v('rule-strong'),
        },
        accent: {
          DEFAULT: v('accent'),
          hover: v('accent-hover'),
          wash: v('accent-wash'),
        },
        positive: { DEFAULT: v('positive'), wash: v('positive-wash') },
        negative: { DEFAULT: v('negative'), wash: v('negative-wash') },
        pending: { DEFAULT: v('pending'), wash: v('pending-wash') },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
