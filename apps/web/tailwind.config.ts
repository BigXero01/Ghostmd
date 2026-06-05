import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080610',
        surface: '#14101f',
        panel: '#1a1528',
        bone: '#e8e0f0',
        purple: {
          DEFAULT: '#9b6dff',
          dark: '#7c4fe0',
          glow: 'rgba(155,109,255,0.3)',
        },
        green: {
          DEFAULT: '#6ee84a',
          glow: 'rgba(110,232,74,0.3)',
        },
        red: {
          DEFAULT: '#e05555',
          glow: 'rgba(224,85,85,0.3)',
        },
      },
      fontFamily: {
        display: ['var(--font-cinzel-decorative)', 'serif'],
        heading: ['var(--font-cinzel)', 'serif'],
        subheading: ['var(--font-im-fell)', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        body: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(rgba(155,109,255,0.15) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(ellipse at 50% 0%, rgba(155,109,255,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(155,109,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(155,109,255,0.6), 0 0 40px rgba(155,109,255,0.3)' },
        },
      },
      animation: {
        flicker: 'flicker 4s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(155,109,255,0.4), 0 0 40px rgba(155,109,255,0.2)',
        'glow-green': '0 0 20px rgba(110,232,74,0.4), 0 0 40px rgba(110,232,74,0.2)',
        'glow-sm': '0 0 8px rgba(155,109,255,0.3)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
