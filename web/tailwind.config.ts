import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f766e', // teal-700
          hover: '#115e59', // teal-800
          soft: '#f0fdfa', // teal-50
        },
      },
    },
  },
  plugins: [],
} satisfies Config
