import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)', panel: 'var(--bg-panel)', raised: 'var(--bg-raised)',
        line: 'var(--line-subtle)', strong: 'var(--line-strong)',
        fg: 'var(--text-primary)', muted: 'var(--text-muted)', faint: 'var(--text-faint)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        ok: 'rgb(var(--ok-rgb) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        risk: 'rgb(var(--risk-rgb) / <alpha-value>)',
        ml: 'rgb(var(--ml-rgb) / <alpha-value>)',
      },
      fontFamily: { sans: ['Inter Variable', 'Inter', 'Noto Sans Devanagari Variable', 'IBM Plex Sans', 'system-ui'], mono: ['JetBrains Mono', 'ui-monospace', 'Noto Sans Devanagari Variable'] },
      boxShadow: { glow: 'var(--glow)' },
    },
  },
} satisfies Config;
