/**
 * Color palettes for curated map themes.
 *
 * Tableau 10: color-blind friendly palette with high perceptual uniformity.
 */
export const PALETTES = {
  /**
   * Categorical colors - Tableau 10 palette with grays for "other"/"missing".
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
    other: '#9ca3af', // for values beyond the top colors
    missing: '#d1d5db', // for features lacking the tag entirely
    stroke: 'rgba(255, 255, 255, 0.8)', // for categorical point stroke
  },
} as const;
