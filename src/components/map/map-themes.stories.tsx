import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useRef, useCallback } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature } from 'geojson';
import { mapStyle } from '@/lib/map-tiles';
import { detectMapThemes, type MapTheme } from '@/lib/map-themes';
import { buildCircleColorExpression, buildCircleRadiusExpression } from '@/components/dataset/map/layers/expressions';
import { MapLegend } from '@/components/dataset/map/map-legend';
// @ts-expect-error – Vite ?raw imports are not typed in tsconfig
import bicycleParkingParisRaw from '@/lib/__tests__/fixtures/bicycle-parking-paris.geojson?raw';

const bicycleParkingRawParsed = JSON.parse(bicycleParkingParisRaw) as FeatureCollection;
const bicycleParkingParisData = {
  ...bicycleParkingRawParsed,
  features: convertPolygonsToPoints(bicycleParkingRawParsed.features)
};

function polygonToCentroidPoint(feature: Feature): Feature {
  if (feature.geometry?.type === 'Polygon') {
    const coordinates = feature.geometry.coordinates[0] as [number, number][];
    const sum = coordinates.reduce((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0]);
    const centroid: [number, number] = [sum[0] / coordinates.length, sum[1] / coordinates.length];
    return {
      ...feature,
      geometry: {
        type: 'Point',
        coordinates: centroid,
      },
    };
  }
  return feature;
}

function convertPolygonsToPoints(features: Feature[]): Feature[] {
  return features.map(polygonToCentroidPoint);
}

function MapLibreMapWithThemes({ features, theme }: { features: Feature[]; theme: MapTheme | null }) {
  const mapRef = useRef<MapRef | null>(null);

  const fitBounds = useCallback(() => {
    if (!mapRef.current || features.length === 0) return;

    const coordinates = features
      .map((f) => {
        if (f.geometry?.type === 'Point') {
          return f.geometry.coordinates as [number, number];
        }
        return null;
      })
      .filter((c): c is [number, number] => c !== null);

    if (coordinates.length === 0) return;

    // Use reduce to avoid spread operator limit on large arrays
    const minLon = coordinates.reduce((a, c) => (c[0] < a ? c[0] : a), coordinates[0][0]);
    const maxLon = coordinates.reduce((a, c) => (c[0] > a ? c[0] : a), coordinates[0][0]);
    const minLat = coordinates.reduce((a, c) => (c[1] < a ? c[1] : a), coordinates[0][1]);
    const maxLat = coordinates.reduce((a, c) => (c[1] > a ? c[1] : a), coordinates[0][1]);

    const bounds: [[number, number], [number, number]] = [
      [minLon, minLat],
      [maxLon, maxLat],
    ];

    mapRef.current.fitBounds(bounds, { padding: 50 });
  }, [features]);

  useEffect(() => {
    fitBounds();
  }, [features, fitBounds]);

  return (
    <div className="relative h-screen w-full">
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: 2.3522,
          latitude: 48.8566,
          zoom: 12,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Source
          id="features"
          type="geojson"
          data={{ type: 'FeatureCollection', features } as FeatureCollection}
        >
          <Layer
            id="points"
            type="circle"
            paint={{
              'circle-radius': theme ? buildCircleRadiusExpression(theme, 7) as number : 7,
              'circle-stroke-width': 1,
              'circle-stroke-color': 'rgba(255, 255, 255, 0.8)',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              'circle-color': theme ? buildCircleColorExpression(theme) as any : '#3b82f6',
            }}
          />
        </Source>
      </Map>

      {/* Legend Overlay */}
      {theme && (
        <div className="absolute z-10 top-4 right-4">
          <MapLegend theme={theme} title={theme.field} />
        </div>
      )}
    </div>
  );
}

const meta: Meta = {
  title: 'Map/MapThemes',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BicycleParkingParisBoolean: Story = {
  render: () => {
    const features = bicycleParkingParisData.features;
    const themes = detectMapThemes(features).filter((t) => t.type === 'boolean');
    const selectedTheme = themes[0] || null;
    return <MapLibreMapWithThemes features={features} theme={selectedTheme} />;
  },
  name: 'Bicycle Parking Paris - Boolean',
  parameters: {
    notes: 'Boolean themes from bicycle parking dataset: covered, shelter. Shows muted fallback for unexpected values.',
  },
};

export const BicycleParkingParisIntensity: Story = {
  render: () => {
    const features = bicycleParkingParisData.features;
    const themes = detectMapThemes(features).filter((t) => t.type === 'intensity');
    const selectedTheme = themes[0] || null;
    return <MapLibreMapWithThemes features={features} theme={selectedTheme} />;
  },
  name: 'Bicycle Parking Paris - Intensity',
  parameters: {
    notes: 'Intensity theme from bicycle parking dataset: capacity. Shows numeric range interpolation with percentile-based bounds (10th-90th).',
  },
};

export const BicycleParkingParisCategorical: Story = {
  render: () => {
    const features = bicycleParkingParisData.features;
    const themes = detectMapThemes(features).filter((t) => t.type === 'categorical');
    const selectedTheme = themes[0] || null;
    return <MapLibreMapWithThemes features={features} theme={selectedTheme} />;
  },
  name: 'Bicycle Parking Paris - Categorical',
  parameters: {
    notes: 'Categorical themes from bicycle parking dataset: bicycle_parking types. Shows top 10 categories with "other" fallback.',
  },
};
