/**
 * Nixa AI — Shadow Scale
 *
 * Cool gray-toned shadows. Borders define structure, shadows define elevation.
 * Used sparingly.
 */

export const shadows = {
  none: 'none',

  // Subtle — inputs, secondary buttons
  xs: '0 1px 2px 0 rgba(15,16,20,0.04)',

  // Default — cards, dropdowns
  sm: '0 1px 3px 0 rgba(15,16,20,0.06), 0 1px 2px -1px rgba(15,16,20,0.04)',

  // Medium — floating panels, popovers
  md: '0 4px 8px -2px rgba(15,16,20,0.06), 0 2px 4px -2px rgba(15,16,20,0.04)',

  // Large — modals, sheets
  lg: '0 12px 24px -6px rgba(15,16,20,0.08), 0 4px 8px -4px rgba(15,16,20,0.04)',

  // Extra large — full-screen overlays, hero cards
  xl: '0 24px 40px -10px rgba(15,16,20,0.12), 0 8px 16px -8px rgba(15,16,20,0.06)',

  // Focus ring — accent blue
  focus:     '0 0 0 3px rgba(79,122,255,0.18)',
  focusDark: '0 0 0 3px rgba(107,146,255,0.28)',
} as const

export type ShadowScale = typeof shadows
