import { describe, it, expect } from 'vitest';
import { buildCircleColorExpression, buildCircleRadiusExpression } from '../expressions';
import {
  buildPointRadiusForCount,
  buildPointStrokeWidth,
  buildLineWidth,
  DEFAULT_STYLE_KNOBS,
  AGE_SORT_KEY,
  LINE_STYLE,
  POLYGON_STYLE,
  POINT_STYLE,
} from '../map-layers';
import type { CategoricalTheme, IntensityTheme } from '@/lib/map-themes/types';

describe('buildCircleColorExpression', () => {
  it('should build case expression for categorical theme', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'amenity',
      colorMap: new Map([
        ['bench', '#4e79a7'],
        ['fountain', '#f28e2c'],
        ['atm', '#e15759'],
      ]),
      topValues: [
        { value: 'bench', count: 100 },
        { value: 'fountain', count: 50 },
        { value: 'atm', count: 25 },
      ],
      otherCount: 10,
    };

    const expression = buildCircleColorExpression(theme);

    expect(expression).toEqual([
      'case',
      ['==', ['downcase', ['get', 'amenity']], 'bench'],
      '#4e79a7',
      ['==', ['downcase', ['get', 'amenity']], 'fountain'],
      '#f28e2c',
      ['==', ['downcase', ['get', 'amenity']], 'atm'],
      '#e15759',
      '#9ca3af', // fallback color
    ]);
  });

  it('should lowercase non-canonical casing colorMap keys', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'covered',
      colorMap: new Map([
        ['Yes', '#4e79a7'],
        ['No', '#e15759'],
      ]),
      topValues: [
        { value: 'Yes', count: 80 },
        { value: 'No', count: 20 },
      ],
      otherCount: 0,
    };

    const expression = buildCircleColorExpression(theme);

    expect(expression).toEqual([
      'case',
      ['==', ['downcase', ['get', 'covered']], 'yes'],
      '#4e79a7',
      ['==', ['downcase', ['get', 'covered']], 'no'],
      '#e15759',
      '#9ca3af', // fallback color
    ]);
  });

  it('should build interpolate expression for intensity theme', () => {
    const theme: IntensityTheme = {
      type: 'intensity',
      field: 'capacity',
      min: 0,
      max: 100,
      colorScale: ['#deebf7', '#08519c'],
    };

    const expression = buildCircleColorExpression(theme);

    expect(expression).toEqual([
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'capacity']],
      0,
      '#deebf7',
      100,
      '#08519c',
    ]);
  });

  it('should throw on unknown theme type', () => {
    const theme = { type: 'unknown' as never, field: 'foo' };
    expect(() => buildCircleColorExpression(theme as never)).toThrow('Unknown theme type');
  });
});

describe('buildCircleRadiusExpression', () => {
  it('should return interpolate expression for intensity theme', () => {
    const theme: IntensityTheme = {
      type: 'intensity',
      field: 'capacity',
      min: 0,
      max: 100,
      colorScale: ['#deebf7', '#08519c'],
    };

    const expression = buildCircleRadiusExpression(theme, 10);

    expect(expression).toEqual([
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'capacity']],
      0,
      5, // 10 * 0.5
      100,
      15, // 10 * 1.5
    ]);
  });

  it('should return base radius number for categorical theme', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'amenity',
      colorMap: new Map([['bench', '#4e79a7']]),
      topValues: [{ value: 'bench', count: 100 }],
      otherCount: 0,
    };

    const expression = buildCircleRadiusExpression(theme, 10);

    expect(expression).toBe(10);
  });

  it('should calculate radius interpolation correctly', () => {
    const theme: IntensityTheme = {
      type: 'intensity',
      field: 'height',
      min: 1,
      max: 50,
      colorScale: ['#e7f0e7', '#006d2c'],
    };

    const expression = buildCircleRadiusExpression(theme, 6);

    expect(expression).toEqual([
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'height']],
      1,
      3, // 6 * 0.5
      50,
      9, // 6 * 1.5
    ]);
  });
});

// A stop output is either a plain number or a recent-boost case expression;
// this extracts the non-recent (fallback) value either way
function baseValue(output: unknown): number {
  if (typeof output === 'number') return output;
  const expr = output as unknown[];
  return expr[expr.length - 1] as number;
}

// ...and this extracts the boosted value applied to recent features
function recentValue(output: unknown): number {
  if (typeof output === 'number') return output;
  return (output as unknown[])[2] as number;
}

const noBoostKnobs = {
  ...DEFAULT_STYLE_KNOBS,
  radiusBoost: { recent: 0, medium: 0, older: 0, 'very-old': 0 },
  recent: { haloWidth: 0 },
};

describe('zoom-responsive styles', () => {
  it('buildPointRadiusForCount scales city-zoom radius by density and grows at high zoom', () => {
    expect(buildPointRadiusForCount(10000, noBoostKnobs)).toEqual([
      'interpolate',
      ['exponential', 1.5],
      ['zoom'],
      12,
      1.75,
      15,
      5,
      18,
      6,
    ]);
    expect(buildPointRadiusForCount(2000, noBoostKnobs)[4]).toBe(2.625);
    expect(buildPointRadiusForCount(100, noBoostKnobs)[4]).toBe(3.5);
  });

  it('recent points get a radius boost at every zoom stop', () => {
    const boosts = DEFAULT_STYLE_KNOBS.radiusBoost;
    // baseValue extracts the case fallback, which carries the very-old boost
    const boostOverVeryOld = boosts.recent - boosts['very-old'];
    expect(boostOverVeryOld).toBeGreaterThan(0);
    const expression = buildPointRadiusForCount(10000);
    for (const stopIndex of [4, 6, 8]) {
      const output = expression[stopIndex];
      expect(recentValue(output)).toBe(baseValue(output) + boostOverVeryOld);
    }
  });

  it('per-category boosts each get a case branch', () => {
    const tuned = {
      ...DEFAULT_STYLE_KNOBS,
      radiusBoost: { recent: 2, medium: 1, older: 0.5, 'very-old': -0.5 },
    };
    const output = buildPointRadiusForCount(100, tuned)[6] as unknown[];
    // z15 base radius 5: recent 7, medium 6, older 5.5, fallback 4.5
    expect(output).toEqual([
      'case',
      ['==', ['get', 'ageCategory'], 'recent'],
      7,
      ['==', ['get', 'ageCategory'], 'medium'],
      6,
      ['==', ['get', 'ageCategory'], 'older'],
      5.5,
      4.5,
    ]);
  });

  it('all points get a hairline at low zoom; recent keeps a wider halo', () => {
    const strokeWidth = buildPointStrokeWidth(DEFAULT_STYLE_KNOBS);
    const z12Output = strokeWidth[4];
    expect(baseValue(z12Output)).toBe(DEFAULT_STYLE_KNOBS.point.strokeZ12);
    expect(recentValue(z12Output)).toBe(DEFAULT_STYLE_KNOBS.recent.haloWidth);
    expect(DEFAULT_STYLE_KNOBS.recent.haloWidth).toBeGreaterThan(
      DEFAULT_STYLE_KNOBS.point.strokeZ12
    );
  });

  it('points get a white border that fades in with zoom', () => {
    expect(POINT_STYLE['circle-stroke-color']).toBe('#ffffff');
    const strokeWidth = POINT_STYLE['circle-stroke-width'] as unknown[];
    expect(strokeWidth.slice(0, 3)).toEqual([
      'interpolate',
      ['exponential', 1.5],
      ['zoom'],
    ]);
    expect(baseValue(strokeWidth[4])).toBe(1);
    expect(baseValue(strokeWidth[6])).toBe(2);
  });

  it('age sort key orders all four categories newest-on-top', () => {
    expect(AGE_SORT_KEY[2]).toBe(3);
    expect(AGE_SORT_KEY[4]).toBe(2);
    expect(AGE_SORT_KEY[6]).toBe(1);
    expect(AGE_SORT_KEY[7]).toBe(0);
  });

  it('builders honor knob overrides (panel and baked code share one path)', () => {
    const tuned = {
      ...DEFAULT_STYLE_KNOBS,
      base: 1.2,
      line: { widthZ8: 5, widthZ13: 3, widthZ18: 10 },
    };
    expect(buildLineWidth(tuned)).toEqual([
      'interpolate',
      ['exponential', 1.2],
      ['zoom'],
      8,
      5,
      13,
      3,
      18,
      10,
    ]);
  });

  it('line, polygon-stroke, and point-stroke widths interpolate exponentially on zoom', () => {
    for (const expression of [
      LINE_STYLE['line-width'],
      POLYGON_STYLE.stroke['line-width'],
      POINT_STYLE['circle-stroke-width'],
    ]) {
      expect(expression.slice(0, 3)).toEqual(['interpolate', ['exponential', 1.5], ['zoom']]);
    }
  });

  it('lines and points grow toward street-level zoom instead of shrinking', () => {
    const lineStops = LINE_STYLE['line-width'] as unknown[];
    // last stop (z18) wider than the mid stop (z13)
    expect(lineStops[lineStops.length - 1]).toBeGreaterThan(Number(lineStops[6]));

    const pointStops = buildPointRadiusForCount(100);
    expect(baseValue(pointStops[pointStops.length - 1])).toBeGreaterThan(
      baseValue(pointStops[6])
    );
  });
});
