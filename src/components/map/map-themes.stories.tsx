import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useRef, useCallback } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature } from 'geojson';
import { mapStyle } from '@/lib/map-tiles';
import { detectMapThemes, buildLegend, type MapTheme } from '@/lib/map-themes';
import { buildCircleColorExpression, buildCircleRadiusExpression } from '@/components/dataset/map/layers/expressions';
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

function BicycleParkingParisStory({ themeType }: { themeType: 'boolean' | 'intensity' | 'categorical' }) {
  const features = bicycleParkingParisData.features;
  const themes = detectMapThemes(features).filter((t) => t.type === themeType);
  const selectedTheme = themes[0] || null;

  return (
    <div className="flex flex-col h-screen">
      {/* Map Section */}
      <div className="flex-1">
        <MapLibreMapWithThemes features={features} theme={selectedTheme} />
      </div>

      {/* Legends Section */}
      <div className="border-t" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">
            {themeType === 'boolean' && 'Boolean Themes'}
            {themeType === 'intensity' && 'Intensity Themes'}
            {themeType === 'categorical' && 'Categorical Themes'}
          </h3>
          {themes.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {themes.map((theme, index) => {
                const legend = buildLegend(theme);
                return (
                  <div key={index} className="border rounded p-3">
                    <h4 className="font-medium mb-2">{theme.field}</h4>
                    <div className="space-y-1">
                      {legend.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              backgroundColor: item.color,
                              border: '1px solid #e5e7eb',
                            }}
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">
              {`No ${themeType} themes detected in this dataset`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const BicycleParkingParisBoolean: Story = {
  render: () => <BicycleParkingParisStory themeType="boolean" />,
  name: 'Bicycle Parking Paris - Boolean',
  parameters: {
    notes: 'Boolean themes from bicycle parking dataset: covered, shelter. Shows muted fallback for unexpected values.',
  },
};

export const BicycleParkingParisIntensity: Story = {
  render: () => <BicycleParkingParisStory themeType="intensity" />,
  name: 'Bicycle Parking Paris - Intensity',
  parameters: {
    notes: 'Intensity theme from bicycle parking dataset: capacity. Shows numeric range interpolation with percentile-based bounds (10th-90th).',
  },
};

export const BicycleParkingParisCategorical: Story = {
  render: () => <BicycleParkingParisStory themeType="categorical" />,
  name: 'Bicycle Parking Paris - Categorical',
  parameters: {
    notes: 'Categorical themes from bicycle parking dataset: bicycle_parking types. Shows top 10 categories with "other" fallback.',
  },
};
