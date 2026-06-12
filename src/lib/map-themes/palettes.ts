// src/lib/map-themes/palettes.ts

/**
 * Color palettes for map themes.
 * Defined as named constants for easy extension (e.g., dark mode variants).
 *
 * Tableau 10: Color-blind friendly palette with high perceptual uniformity.
 * Blue gradient: Standard sequential scale for intensity.
 * Boolean pairs: High contrast for binary distinctions.
 */
export const PALETTES = {
  /**
   * Categorical colors - Tableau 10 palette with gray for "other".
   * Used for properties with 2-30 distinct values.
   */
  categorical: {
    tableau10: [
      '#4e79a7', // blue
      '#f28e2c', // orange
      '#e15759', // red
      '#76b7b2', // cyan
      '#59a14f', // green
      '#edc948', // yellow
      '#b07aa1', // purple
      '#ff9da7', // pink
      '#9c755f', // brown
      '#bab0ac', // gray
    ] as const,
    other: '#9ca3af', // for values beyond top 10
  },

  /**
   * Intensity colors - sequential scales for numeric ranges.
   * Light to dark gradient.
   */
  intensity: {
    blue: ['#deebf7', '#08519c'] as const,
    green: ['#e7f0e7', '#006d2c'] as const,
    orange: ['#fee5d9', '#a50f15'] as const,
  },

  /**
   * Boolean colors - high contrast pairs for binary values.
   * Pattern matching: yes/no → green/red, true/false → blue/gray, 1/0 → green/amber
   */
  boolean: {
    yesNo: { true: '#22c55e', false: '#ef4444', muted: '#9ca3ae' } as const,
    trueFalse: { true: '#3b82f6', false: '#9ca3af', muted: '#6b7280' } as const,
    oneZero: { true: '#22c55e', false: '#f59e0b', muted: '#9ca3ae' } as const,
    blueOrange: { true: '#3b82f6', false: '#f97316', muted: '#94a3b8' } as const,
    tealCoral: { true: '#14b8a6', false: '#fb7185', muted: '#94a3b8' } as const,
    purplePink: { true: '#a855f7', false: '#ec4899', muted: '#94a3b8' } as const,
    blueOrangeDark: { true: '#2171b5', false: '#d94801', muted: '#9ca3af' } as const,
  },
} as const;

/**
 * Default palette to use when creating themes.
 * Can be overridden for dark mode, etc.
 */
export const DEFAULT_PALETTE = 'blue' as const;
