/**
 * Nixa AI — Typography Scale
 *
 * Modern sans pairing: Inter (body) + Bricolage Grotesque (display).
 * No serif. Geometric, contemporary, AI-product friendly.
 */

export const fontFamily = {
  display: [
    'var(--font-display)',
    '"Bricolage Grotesque"',
    '-apple-system',
    'BlinkMacSystemFont',
    'sans-serif',
  ].join(', '),
  sans: [
    'var(--font-sans)',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'sans-serif',
  ].join(', '),
  mono: [
    'var(--font-mono)',
    '"JetBrains Mono"',
    'ui-monospace',
    'monospace',
  ].join(', '),
} as const

export const fontSize: Record<string, [string, { lineHeight: string }]> = {
  '2xs': ['10px', { lineHeight: '14px' }],
  xs:    ['12px', { lineHeight: '16px' }],
  sm:    ['13px', { lineHeight: '20px' }],
  base:  ['14px', { lineHeight: '22px' }],
  md:    ['15px', { lineHeight: '24px' }],
  lg:    ['16px', { lineHeight: '26px' }],
  xl:    ['18px', { lineHeight: '28px' }],
  '2xl': ['22px', { lineHeight: '30px' }],
  '3xl': ['28px', { lineHeight: '36px' }],
  '4xl': ['36px', { lineHeight: '42px' }],
  '5xl': ['48px', { lineHeight: '54px' }],
  '6xl': ['64px', { lineHeight: '68px' }],
}

export const fontWeight = {
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
} as const
