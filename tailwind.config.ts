import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nixa: {
          50: '#fdfefe',
          100: '#d4e0f3',
          300: '#9ac5ef',
          500: '#4f7a96',
          600: '#425f83',
          700: '#17223d',
          800: '#4cacc7',
          900: '#7addf1',
        },
        dark: {
          bg: '#0f1419',
          surface: '#1a1f2e',
          text: '#e4e6eb',
          primary: '#6b9dc4',
          accent: '#5bc0de',
          muted: '#6b7280',
          border: '#2d3748',
          hover: '#252d3d',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: { color: '#4cacc7' },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            code: {
              backgroundColor: '#d4e0f3',
              borderRadius: '0.25rem',
              padding: '0.125rem 0.375rem',
              fontWeight: '400',
            },
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
