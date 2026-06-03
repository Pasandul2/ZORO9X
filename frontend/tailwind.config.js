/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#0a0a0a',
          100: '#0d0d0d',
          200: '#111111',
          300: '#141414',
          400: '#1a1a1a',
          500: '#1e1e1e',
          600: '#252525',
          700: '#2e2e2e',
          800: '#3a3a3a',
          900: '#484848',
        },
        premium: {
          indigo: '#4f46e5',
          purple: '#7c3aed',
          violet: '#8b5cf6',
          pink: '#c084fc',
          blue: '#6366f1',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'border-glow': 'border-glow 4s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'spin-slower': 'spin 35s linear infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.7' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

