import type { Config } from 'tailwindcss'
import { palette, radius, shadows, fontFamily, fontSize } from './src/shared/theme'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Accent ──────────────────────────────────────────────────────────
        accent: palette.accent,

        // ─── Neutral scale ───────────────────────────────────────────────────
        neutral: palette.neutral,

        // ─── Semantic ────────────────────────────────────────────────────────
        success: palette.success,
        warning: palette.warning,
        error:   palette.error,

        // ─── Legacy aliases (kept for backward compatibility) ─────────────────
        // Remove gradually as components are migrated to the new tokens.
        nixa: {
          50:  palette.neutral[50],
          100: palette.neutral[100],
          200: palette.neutral[200],
          300: palette.neutral[300],
          400: palette.neutral[400],
          500: palette.accent.DEFAULT,
          600: palette.accent.hover,
          700: palette.text.primary,
          800: palette.accent.dark,
          900: palette.accent.muted,
        },
        dark: {
          bg:      palette.neutral[900],
          surface: palette.neutral[850],
          text:    palette.text.darkPrimary,
          primary: palette.accent.dark,
          accent:  palette.accent.dark,
          muted:   palette.text.darkMuted,
          border:  palette.neutral[800],
          hover:   palette.neutral[800],
        },
      },

      borderRadius: radius,

      boxShadow: shadows,

      fontFamily: {
        sans:    fontFamily.sans.split(', '),
        display: fontFamily.display.split(', '),
        mono:    fontFamily.mono.split(', '),
      },

      fontSize,

      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: { color: palette.accent.DEFAULT },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            code: {
              backgroundColor: palette.neutral[100],
              borderRadius: radius.xs,
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
