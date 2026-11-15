/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1A1A1A',
          2: '#4A4741',
          3: '#7C776E',
        },
        rule: {
          DEFAULT: '#E2DED5',
          strong: '#C9C3B6',
        },
        accent: {
          DEFAULT: '#1F45A8',
          hover: '#17357F',
          wash: '#EAEEF8',
        },
        positive: { DEFAULT: '#2D6A3E', wash: '#E7F0E8' },
        negative: { DEFAULT: '#A1342A', wash: '#F6E7E4' },
        pending: { DEFAULT: '#8A5A0B', wash: '#F5EDDC' },
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
