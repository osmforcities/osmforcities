import { describe, it, expect } from 'vitest';
import { buildCircleColorExpression, buildCircleRadiusExpression } from '../expressions';
import type { CategoricalTheme, BooleanTheme, IntensityTheme } from '@/lib/map-themes/types';

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
      ['==', ['get', 'amenity'], 'bench'],
      '#4e79a7',
      ['==', ['get', 'amenity'], 'fountain'],
      '#f28e2c',
      ['==', ['get', 'amenity'], 'atm'],
      '#e15759',
      '#9ca3af', // fallback color
    ]);
  });

  it('should build case expression for boolean yes/no theme', () => {
    const theme: BooleanTheme = {
      type: 'boolean',
      field: 'covered',
      trueColor: '#22c55e',
      falseColor: '#ef4444',
      trueValue: 'yes',
      falseValue: 'no',
    };

    const expression = buildCircleColorExpression(theme);

    expect(expression).toEqual([
      'case',
      ['==', ['get', 'covered'], 'yes'],
      '#22c55e',
      '#ef4444',
    ]);
  });

  it('should build case expression for boolean true/false theme', () => {
    const theme: BooleanTheme = {
      type: 'boolean',
      field: 'lit',
      trueColor: '#3b82f6',
      falseColor: '#9ca3af',
      trueValue: true,
      falseValue: false,
    };

    const expression = buildCircleColorExpression(theme);

    expect(expression).toEqual([
      'case',
      ['==', ['get', 'lit'], true],
      '#3b82f6',
      '#9ca3af',
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
      ['get', 'capacity'],
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
      ['get', 'capacity'],
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

  it('should return base radius number for boolean theme', () => {
    const theme: BooleanTheme = {
      type: 'boolean',
      field: 'covered',
      trueColor: '#22c55e',
      falseColor: '#ef4444',
      trueValue: 'yes',
      falseValue: 'no',
    };

    const expression = buildCircleRadiusExpression(theme, 8);

    expect(expression).toBe(8);
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
      ['get', 'height'],
      1,
      3, // 6 * 0.5
      50,
      9, // 6 * 1.5
    ]);
  });
});
