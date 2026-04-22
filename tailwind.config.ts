import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ht-bg':      '#0d0d14',
        'ht-surface': '#13131f',
        'ht-card':    '#1a1a2e',
        'ht-border':  '#2a2a3e',
        'ht-accent':  '#e63946',
        'ht-text':    '#e2e8f0',
        'ht-muted':   '#94a3b8',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
