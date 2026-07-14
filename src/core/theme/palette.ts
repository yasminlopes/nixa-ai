/**
 * Nixa AI — Color Palette
 *
 * Cool gray surfaces, electric blue accent, ink black CTAs.
 * Single accent color, neutral-first.
 */

export const palette = {
  // ─── Accent — Electric Blue ─────────────────────────────────────────────────
  accent: {
    light:   '#E8F0FF',
    DEFAULT: '#4F7AFF',
    hover:   '#3D63E8',
    muted:   '#A8BEF8',
    dark:    '#6B92FF',
    deep:    '#1E3A8A',
  },

  // ─── Neutrals — cool gray with subtle blue undertone ───────────────────────
  neutral: {
    0:    '#FFFFFF',
    50:   '#FAFBFC',
    100:  '#F4F5F8', // app background — cool gray
    150:  '#EDEEF2',
    200:  '#E4E6EB', // borders
    300:  '#D1D4DB',
    400:  '#9CA0AC',
    500:  '#6E7280',
    600:  '#4A4D57',
    700:  '#2E3038',
    800:  '#1F2027',
    850:  '#16171C',
    900:  '#0F1014',
    950:  '#0A0B0E',
    1000: '#000000',
  },

  text: {
    primary:   '#0A0B0E',
    secondary: '#4A4D57',
    muted:     '#9CA0AC',
    inverted:  '#FFFFFF',
    darkPrimary:   '#F4F5F8',
    darkSecondary: '#C5C8CF',
    darkMuted:     '#6E7280',
  },

  success: {
    light: '#D1F4E0',
    DEFAULT: '#10B981',
    dark: '#34D399',
  },
  warning: {
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#FBBF24',
  },
  error: {
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#F87171',
  },
} as const

export type Palette = typeof palette
