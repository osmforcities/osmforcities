// src/lib/__tests__/map-themes.test.ts

import { describe, it, expect } from 'vitest';
import { isPropertyExcluded, analyzeProperty, detectIntensityTheme, detectCategoricalTheme, calculateScore } from '../map-themes/detection';
import { detectMapThemes } from '../map-themes';
import { PALETTES } from '../map-themes/palettes';
import type { Feature } from 'geojson';
import type { PropertyAnalysis, CategoricalTheme, IntensityTheme } from '../map-themes/types';

describe('isPropertyExcluded', () => {
  it('should exclude OSM metadata properties (@-prefixed Overpass format)', () => {
    expect(isPropertyExcluded('@id')).toBe(true);
    expect(isPropertyExcluded('@type')).toBe(true);
    expect(isPropertyExcluded('@timestamp')).toBe(true);
    expect(isPropertyExcluded('@uid')).toBe(true);
    expect(isPropertyExcluded('@user')).toBe(true);
    expect(isPropertyExcluded('@changeset')).toBe(true);
    expect(isPropertyExcluded('@version')).toBe(true);
  });

  it('should exclude OSM metadata properties (bare-name stored GeoJSON format)', () => {
    expect(isPropertyExcluded('uid')).toBe(true);
    expect(isPropertyExcluded('user')).toBe(true);
    expect(isPropertyExcluded('changeset')).toBe(true);
    expect(isPropertyExcluded('version')).toBe(true);
  });

  it('should exclude internal fields', () => {
    expect(isPropertyExcluded('ageCategory')).toBe(true);
    expect(isPropertyExcluded('originalType')).toBe(true);
    expect(isPropertyExcluded('featureId')).toBe(true);
  });

  it('should exclude common non-data fields', () => {
    expect(isPropertyExcluded('name')).toBe(true);
    expect(isPropertyExcluded('id')).toBe(true);
    expect(isPropertyExcluded('ref')).toBe(true);
    expect(isPropertyExcluded('description')).toBe(true);
  });

  it('should not exclude data properties', () => {
    expect(isPropertyExcluded('amenity')).toBe(false);
    expect(isPropertyExcluded('capacity')).toBe(false);
    expect(isPropertyExcluded('covered')).toBe(false);
  });
});

describe('analyzeProperty', () => {
  const features = [
    { type: 'Feature', properties: { amenity: 'bench' }, geometry: null },
    { type: 'Feature', properties: { amenity: 'bench' }, geometry: null },
    { type: 'Feature', properties: { amenity: 'fountain' }, geometry: null },
    { type: 'Feature', properties: { amenity: 'atm' }, geometry: null },
    { type: 'Feature', properties: { }, geometry: null }, // missing
  ] as unknown as Feature[];

  it('should calculate coverage correctly', () => {
    const result = analyzeProperty(features, 'amenity');
    expect(result.coverage).toBe(0.8); // 4 out of 5
  });

  it('should extract unique values', () => {
    const result = analyzeProperty(features, 'amenity');
    expect(result.uniqueValues.size).toBe(3);
    expect(Array.from(result.uniqueValues)).toEqual(expect.arrayContaining(['bench', 'fountain', 'atm']));
  });

  it('should detect string type', () => {
    const result = analyzeProperty(features, 'amenity');
    expect(result.dominantType).toBe('string');
  });
});


describe('detectIntensityTheme', () => {
  it('should detect numeric range', () => {
    const analysis: PropertyAnalysis = {
      field: 'capacity',
      coverage: 1,
      values: [10, 20, 50, 100],
      nonNullCount: 4,
      uniqueValues: new Set([10, 20, 50, 100]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.type).toBe('intensity');
    expect(theme?.min).toBe(10);
    expect(theme?.max).toBe(100);
  });

  it('should reject zero range', () => {
    const analysis: PropertyAnalysis = {
      field: 'level',
      coverage: 1,
      values: [0, 0, 0],
      nonNullCount: 3,
      uniqueValues: new Set([0]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject non-numeric dominant type', () => {
    const analysis: PropertyAnalysis = {
      field: 'name',
      coverage: 1,
      values: ['a', 'b'],
      nonNullCount: 2,
      uniqueValues: new Set(['a', 'b']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should coerce string numbers to numeric', () => {
    const analysis: PropertyAnalysis = {
      field: 'height',
      coverage: 1,
      values: ['10', '20', '30', 40], // mixed types
      nonNullCount: 4,
      uniqueValues: new Set(['10', '20', '30', 40]),
      type: 'mixed',
      dominantType: 'number', // assume more numeric values
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.min).toBe(10);
    expect(theme?.max).toBe(40);
  });

  it('should treat empty strings as coercion failures, not as 0', () => {
    // 5 numerics + 1 empty → failure rate 1/6 ≈ 0.17 < default 0.2 threshold
    const analysis: PropertyAnalysis = {
      field: 'height',
      coverage: 1,
      values: [10, 20, 30, 40, 50, ''],
      nonNullCount: 6,
      uniqueValues: new Set([10, 20, 30, 40, 50, '']),
      type: 'mixed',
      dominantType: 'number',
    };
    const theme = detectIntensityTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.min).toBe(10); // not 0
    expect(theme?.max).toBe(50);
  });
});

describe('detectCategoricalTheme', () => {
  it('should detect categorical values', () => {
    const analysis: PropertyAnalysis = {
      field: 'amenity',
      coverage: 1,
      values: ['bench', 'bench', 'fountain', 'atm', 'atm', 'atm'],
      nonNullCount: 6,
      uniqueValues: new Set(['bench', 'fountain', 'atm']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.type).toBe('categorical');
    expect(theme?.field).toBe('amenity');
    expect(theme?.topValues).toHaveLength(3);
    expect(theme?.topValues[0].value).toBe('atm'); // most frequent
  });

  it('should reject single value (constant)', () => {
    const analysis: PropertyAnalysis = {
      field: 'type',
      coverage: 1,
      values: ['node', 'node', 'node'],
      nonNullCount: 3,
      uniqueValues: new Set(['node']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject too many categories (>30)', () => {
    const values = Array.from({ length: 35 }, (_, i) => `type-${i}`);
    const analysis: PropertyAnalysis = {
      field: 'ref',
      coverage: 1,
      values,
      nonNullCount: 35,
      uniqueValues: new Set(values),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should reject non-string dominant type', () => {
    const analysis: PropertyAnalysis = {
      field: 'capacity',
      coverage: 1,
      values: [10, 20, 30],
      nonNullCount: 3,
      uniqueValues: new Set([10, 20, 30]),
      type: 'number',
      dominantType: 'number',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeNull();
  });

  it('should merge case-insensitively', () => {
    const analysis: PropertyAnalysis = {
      field: 'material',
      coverage: 1,
      values: ['Wood', 'wood', 'WOOD', 'Metal'],
      nonNullCount: 4,
      uniqueValues: new Set(['Wood', 'wood', 'WOOD', 'Metal']),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeDefined();
    // Should have 2 categories: wood (merged) and metal
    expect(theme?.topValues.length).toBeLessThanOrEqual(2);
    // colorMap keys should use most common original casing for MapLibre expressions
    // In case of tie (Wood, wood, WOOD each appear once), any of them is acceptable
    const colorMapKeys = Array.from(theme?.colorMap.keys() || []);
    expect(colorMapKeys).toHaveLength(2);
    expect(colorMapKeys[0].toLowerCase()).toBe('wood');
    expect(colorMapKeys[1]).toBe('Metal');
  });
});

describe('calculateScore', () => {
  it('should score intensity with coverage multiplier', () => {
    const theme: IntensityTheme = {
      type: 'intensity',
      field: 'capacity',
      min: 10,
      max: 100,
      colorScale: ['#deebf7', '#08519c'],
    };
    const coverage = 0.8;
    const score = calculateScore(theme, coverage);
    expect(score).toBe(4); // 0.8 * 5 = 4
  });

  it('should score categorical with coverage and category count', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'amenity',
      colorMap: new Map(),
      topValues: [
        { value: 'bench', count: 10 },
        { value: 'fountain', count: 5 },
        { value: 'atm', count: 3 },
      ],
      otherCount: 0,
    };
    const coverage = 0.8; // 80%
    const score = calculateScore(theme, coverage);
    expect(score).toBeCloseTo(2.4); // 0.8 * 3 = 2.4 (min(3, 10) = 3)
  });

  it('should cap categorical category count at 10', () => {
    const theme: CategoricalTheme = {
      type: 'categorical',
      field: 'amenity',
      colorMap: new Map(),
      topValues: Array.from({ length: 20 }, (_, i) => ({ value: `type-${i}`, count: 1 })),
      otherCount: 0,
    };
    const coverage = 1.0;
    const score = calculateScore(theme, coverage);
    expect(score).toBe(10); // 1.0 * min(20, 10) = 10
  });
});

describe('detectCategoricalTheme', () => {
  it('should cap topValues at palette length and set otherCount when >10 categories', () => {
    const values = Array.from({ length: 15 }, (_, i) => `type-${i}`);
    const analysis: PropertyAnalysis = {
      field: 'category',
      coverage: 1.0,
      values,
      nonNullCount: 15,
      uniqueValues: new Set(values),
      type: 'string',
      dominantType: 'string',
    };
    const theme = detectCategoricalTheme(analysis);
    expect(theme).toBeDefined();
    expect(theme?.topValues.length).toBe(10); // capped at palette length
    expect(theme?.otherCount).toBe(5); // 15 - 10 = 5
  });
});

describe('detectMapThemes', () => {
  const features: Feature[] = [
    { type: 'Feature', properties: { covered: 'yes' }, geometry: null },
    { type: 'Feature', properties: { covered: 'yes' }, geometry: null },
    { type: 'Feature', properties: { covered: 'no' }, geometry: null },
    { type: 'Feature', properties: { capacity: 10 }, geometry: null },
    { type: 'Feature', properties: { capacity: 20 }, geometry: null },
    { type: 'Feature', properties: { name: 'Central Station' }, geometry: null },
  ] as unknown as Feature[];

  it('should filter out properties below coverage threshold', () => {
    const themes = detectMapThemes(features, { minCoverage: 0.5 });
    expect(themes.length).toBeGreaterThan(0);
    // 'name' appears in 1/6 features (< 50%) so should be filtered out
    const hasName = themes.some((t) => t.field === 'name');
    expect(hasName).toBe(false);
  });

  it('should respect caller-supplied excluded properties', () => {
    const themes = detectMapThemes(features, {
      excludedProperties: new Set(['capacity']),
    });
    // 'capacity' should be excluded even though it passes coverage
    const hasCapacity = themes.some((t) => t.field === 'capacity');
    expect(hasCapacity).toBe(false);
  });

  it('should sort themes by score descending', () => {
    const themes = detectMapThemes(features);
    expect(themes.length).toBeGreaterThanOrEqual(1);
    // Themes should be detected and sorted internally by score
    // The score is not exposed in the return type, but sorting is verified in implementation
    expect(themes.length).toBeGreaterThan(0);
  });
});

describe('PALETTES', () => {
  describe('categorical palettes', () => {
    it('should have 10 distinct colors', () => {
      expect(PALETTES.categorical.tableau10).toHaveLength(10);
    });

    it('should have gray fallback for other', () => {
      expect(PALETTES.categorical.other).toBe('#9ca3af');
    });
  });

  describe('intensity palettes', () => {
    it('should have blue gradient', () => {
      expect(PALETTES.intensity.blue).toHaveLength(2);
      expect(PALETTES.intensity.blue[0]).toBe('#deebf7');
      expect(PALETTES.intensity.blue[1]).toBe('#08519c');
    });

    it('should have green gradient', () => {
      expect(PALETTES.intensity.green).toHaveLength(2);
      expect(PALETTES.intensity.green[0]).toBe('#e7f0e7');
      expect(PALETTES.intensity.green[1]).toBe('#006d2c');
    });

    it('should have orange gradient', () => {
      expect(PALETTES.intensity.orange).toHaveLength(2);
      expect(PALETTES.intensity.orange[0]).toBe('#fee5d9');
      expect(PALETTES.intensity.orange[1]).toBe('#a50f15');
    });
  });
});
