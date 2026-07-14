/**
 * Nixa AI — Border Radius Scale
 *
 * Editorial: warm and generous, never sharp. Cards feel like letters/notes.
 */

export const radius = {
  none: '0px',
  xs:   '4px',
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  '2xl':'22px',
  '3xl':'28px',
  full: '9999px',
} as const

export const radiusAlias = {
  button:    radius.md,
  input:     radius.lg,
  card:      radius.xl,
  modal:     radius['2xl'],
  badge:     radius.full,
  avatar:    radius.full,
  bubble:    radius.xl,
  chip:      radius.sm,
  tooltip:   radius.sm,
} as const

export type RadiusScale = typeof radius
