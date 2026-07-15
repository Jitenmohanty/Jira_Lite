import type { Config } from 'tailwindcss';

/** Maps semantic tokens (defined as RGB channels in globals.css) to Tailwind. */
const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha('--background'),
        surface: {
          DEFAULT: withAlpha('--surface'),
          hover: withAlpha('--surface-hover'),
          elevated: withAlpha('--surface-elevated'),
        },
        border: {
          DEFAULT: withAlpha('--border'),
          subtle: withAlpha('--border-subtle'),
        },
        foreground: withAlpha('--foreground'),
        muted: withAlpha('--muted'),
        faint: withAlpha('--faint'),
        accent: {
          DEFAULT: withAlpha('--accent'),
          hover: withAlpha('--accent-hover'),
          foreground: withAlpha('--accent-foreground'),
        },
        success: withAlpha('--success'),
        warning: withAlpha('--warning'),
        danger: withAlpha('--danger'),
        ring: withAlpha('--ring'),
        status: {
          backlog: withAlpha('--status-backlog'),
          todo: withAlpha('--status-todo'),
          'in-progress': withAlpha('--status-in-progress'),
          done: withAlpha('--status-done'),
          cancelled: withAlpha('--status-cancelled'),
        },
        priority: {
          none: withAlpha('--priority-none'),
          low: withAlpha('--priority-low'),
          medium: withAlpha('--priority-medium'),
          high: withAlpha('--priority-high'),
          urgent: withAlpha('--priority-urgent'),
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'scale-in': 'scale-in 0.12s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
