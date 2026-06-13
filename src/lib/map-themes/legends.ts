// src/lib/map-themes/legends.ts

import type { MapTheme } from './types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { IntensityTheme } from './types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CategoricalTheme } from './types';
import { PALETTES } from './palettes';

/**
 * A single legend item with label and color.
 */
export interface LegendItem {
  label: string;
  color: string;
}

/**
 * A complete legend with ordered items for display.
 */
export interface Legend {
  items: LegendItem[];
}

/**
 * Build a legend from a detected map theme.
 * Returns structured items for UI display.
 */
export function buildLegend(theme: MapTheme): Legend {
  if (theme.type === 'intensity') {
    // Intensity: show min and max values with their colors
    return {
      items: [
        { label: String(theme.min), color: theme.colorScale[0] },
        { label: String(theme.max), color: theme.colorScale[1] },
      ],
    };
  }

  if (theme.type === 'categorical') {
    // Categorical: show top values with their colors
    const items: LegendItem[] = theme.topValues.map(({ value }) => ({
      label: value,
      color: theme.colorMap.get(value)!,
    }));

    // Add "other" item if there are additional categories beyond the top values
    if (theme.otherCount > 0) {
      items.push({
        label: 'Other',
        color: PALETTES.categorical.other,
      });
    }

    return { items };
  }

  // Should never happen (exhaustive check)
  throw new Error(`Unknown theme type: ${(theme as { type: string }).type}`);
}
