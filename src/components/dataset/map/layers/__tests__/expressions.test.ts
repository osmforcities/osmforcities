import { describe, it, expect } from 'vitest';
import { buildCircleColorExpression, buildCircleRadiusExpression } from '../expressions';
import { buildPointRadiusForCount, LINE_STYLE, POLYGON_STYLE, POINT_STYLE } from '../map-layers';
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

describe('zoom-responsive styles', () => {
  it('buildPointRadiusForCount scales low-zoom radius by density and grows at high zoom', () => {
    expect(buildPointRadiusForCount(10000)).toEqual([
      'interpolate',
      ['exponential', 1.5],
      ['zoom'],
      8,
      2,
      14,
      2.5,
      18,
      6,
    ]);
    expect(buildPointRadiusForCount(2000)[4]).toBe(3);
    expect(buildPointRadiusForCount(100)[4]).toBe(3.5);
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
    const lineStops = LINE_STYLE['line-width'];
    // last stop (z18) wider than the mid stop (z13)
    expect(lineStops[lineStops.length - 1]).toBeGreaterThan(Number(lineStops[6]));

    const pointStops = buildPointRadiusForCount(100);
    expect(pointStops[pointStops.length - 1]).toBeGreaterThan(Number(pointStops[6]));
  });
});
