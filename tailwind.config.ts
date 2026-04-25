import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#140f1f',
        violet: {
          50: '#f6f2ff',
          100: '#ede3ff',
          200: '#d7c2ff',
          300: '#c09bff',
          400: '#a96eff',
          500: '#8952ff',
          600: '#6f39e7',
          700: '#5d2ac1',
          800: '#462193',
          900: '#2e165f'
        }
      },
      boxShadow: {
        soft: '0 20px 80px rgba(111, 57, 231, 0.12)',
        glow: '0 0 0 1px rgba(111, 57, 231, 0.14), 0 24px 80px rgba(111, 57, 231, 0.16)'
      },
      backgroundImage: {
        'grain-radial': 'radial-gradient(circle at top, rgba(137, 82, 255, 0.18), transparent 44%), radial-gradient(circle at bottom right, rgba(137, 82, 255, 0.12), transparent 30%)'
      },
      letterSpacing: {
        editorial: '-0.04em'
      }
    }
  },
  plugins: []
};

export default config;
