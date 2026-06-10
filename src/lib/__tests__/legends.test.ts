import { describe, it, expect } from 'vitest';
import { buildLegend } from '../map-themes';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Legend } from '../map-themes';
import type { MapTheme } from '../map-themes/types';

describe('buildLegend', () => {
  describe('boolean themes', () => {
    it('creates legend with yes/no/muted items for yes/no pattern', () => {
      const theme: MapTheme = {
        type: 'boolean',
        field: 'bicycle_parking',
        trueColor: '#22c55e',
        falseColor: '#ef4444',
        trueValue: 'yes',
        falseValue: 'no',
        trueAliases: [],
      };

      const legend = buildLegend(theme);

      expect(legend.items).toHaveLength(3);
      expect(legend.items[0]).toEqual({
        label: 'Yes',
        color: '#22c55e',
      });
      expect(legend.items[1]).toEqual({
        label: 'No',
        color: '#ef4444',
      });
      expect(legend.items[2].label).toBe('Not applicable');
      expect(legend.items[2].color).toBeDefined();
    });

    it('creates legend with yes/no/muted items for true/false pattern', () => {
      const theme: MapTheme = {
        type: 'boolean',
        field: 'bicycle_parking',
        trueColor: '#3b82f6',
        falseColor: '#9ca3af',
        trueValue: true,
        falseValue: false,
        trueAliases: [],
      };

      const legend = buildLegend(theme);

      expect(legend.items).toHaveLength(3);
      expect(legend.items[0]).toEqual({
        label: 'True',
        color: '#3b82f6',
      });
      expect(legend.items[1]).toEqual({
        label: 'False',
        color: '#9ca3af',
      });
      expect(legend.items[2].label).toBe('Not applicable');
      expect(legend.items[2].color).toBeDefined();
    });
  });

  describe('intensity themes', () => {
    it('creates legend with min/max range', () => {
      const theme: MapTheme = {
        type: 'intensity',
        field: 'capacity',
        min: 0,
        max: 100,
        colorScale: ['#deebf7', '#08519c'],
      };

      const legend = buildLegend(theme);

      expect(legend.items).toHaveLength(2);
      expect(legend.items[0]).toEqual({
        label: '0',
        color: '#deebf7',
      });
      expect(legend.items[1]).toEqual({
        label: '100',
        color: '#08519c',
      });
    });
  });

  describe('categorical themes', () => {
    it('creates legend with top values', () => {
      const colorMap = new Map([
        ['stands', '#4e79a7'],
        ['lockers', '#f28e2c'],
        ['shed', '#e15759'],
      ]);

      const theme: MapTheme = {
        type: 'categorical',
        field: 'bicycle_parking',
        colorMap,
        topValues: [
          { value: 'stands', count: 10 },
          { value: 'lockers', count: 8 },
          { value: 'shed', count: 5 },
        ],
        otherCount: 5,
      };

      const legend = buildLegend(theme);

      expect(legend.items).toHaveLength(4); // 3 top values + 1 other
      expect(legend.items[0]).toEqual({
        label: 'stands',
        color: '#4e79a7',
      });
      expect(legend.items[1]).toEqual({
        label: 'lockers',
        color: '#f28e2c',
      });
      expect(legend.items[2]).toEqual({
        label: 'shed',
        color: '#e15759',
      });
    });

    it('includes "other" item when otherCount > 0', () => {
      const colorMap = new Map([
        ['stands', '#4e79a7'],
        ['lockers', '#f28e2c'],
      ]);

      const theme: MapTheme = {
        type: 'categorical',
        field: 'bicycle_parking',
        colorMap,
        topValues: [
          { value: 'stands', count: 10 },
          { value: 'lockers', count: 8 },
        ],
        otherCount: 5,
      };

      const legend = buildLegend(theme);

      const otherItem = legend.items[legend.items.length - 1];
      expect(otherItem.label).toBe('Other');
      expect(otherItem.color).toBeDefined();
    });

    it('does not include "other" item when otherCount is 0', () => {
      const colorMap = new Map([
        ['stands', '#4e79a7'],
        ['lockers', '#f28e2c'],
      ]);

      const theme: MapTheme = {
        type: 'categorical',
        field: 'bicycle_parking',
        colorMap,
        topValues: [
          { value: 'stands', count: 10 },
          { value: 'lockers', count: 8 },
        ],
        otherCount: 0,
      };

      const legend = buildLegend(theme);

      expect(legend.items).toHaveLength(2);
      expect(legend.items.some(item => item.label === 'Other')).toBe(false);
    });
  });
});
