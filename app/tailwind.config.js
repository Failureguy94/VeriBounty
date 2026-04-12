/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0520',
        surface: '#1a0a38',
        surfaceLight: '#25104d',
        primary: '#FFD700',
        primaryHover: '#FFC200',
        accent: '#a855f7',
        accentLight: '#c084fc',
        textPrimary: '#f3f0ff',
        textSecondary: '#a89bc2',
        border: '#3d2466',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at top, #2d0a6b 0%, #0f0520 60%)',
        'card-gradient': 'linear-gradient(135deg, #1a0a38 0%, #25104d 100%)',
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
