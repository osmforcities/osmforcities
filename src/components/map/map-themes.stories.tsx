import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useState, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature } from 'geojson';
import { mapStyle } from '@/lib/map-tiles';
import { detectMapThemes, type MapTheme } from '@/lib/map-themes';
// @ts-expect-error – Vite ?raw imports are not typed in tsconfig
import parisBusStopsRaw from '@/lib/__tests__/fixtures/bus-stops-paris.geojson?raw';

const parisBusStopsData = JSON.parse(parisBusStopsRaw) as FeatureCollection;

/**
 * Build MapLibre paint expression for circle-color based on selected theme.
 */
function getCircleColorExpression(theme: MapTheme | null): unknown[] {
  if (!theme) {
    return ['#3b82f6'];
  }

  switch (theme.type) {
    case 'boolean': {
      return [
        'match',
        ['get', theme.field],
        theme.trueValue,
        theme.trueColor,
        theme.falseValue,
        theme.falseColor,
        '#9ca3af', // fallback for other values
      ];
    }

    case 'categorical': {
      // Build match expression from colorMap
      const matches: unknown[] = ['match', ['get', theme.field]];
      for (const [value, color] of theme.colorMap.entries()) {
        matches.push(value, color);
      }
      matches.push('#9ca3af'); // fallback for "other"
      return matches;
    }

    case 'intensity': {
      const [colorMin, colorMax] = theme.colorScale;
      return [
        'interpolate',
        ['linear'],
        ['to-number', ['get', theme.field]],
        theme.min,
        colorMin,
        theme.max,
        colorMax,
      ];
    }

    default:
      return ['#3b82f6'];
  }
}

function MapThemesViewer({ features }: { features: Feature[] }) {
  const [themes, setThemes] = useState<MapTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<MapTheme | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    const detected = detectMapThemes(features);
    setThemes(detected);
    if (detected.length > 0) {
      setSelectedTheme(detected[0]);
    }
  }, [features]);

  const fitBounds = () => {
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
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-4">{"Detected Themes"}</h2>

        {themes.length === 0 ? (
          <p className="text-gray-500">{"No themes detected"}</p>
        ) : (
          <ul className="space-y-2">
            {themes.map((theme, i) => (
              <li key={i}>
                <button
                  onClick={() => setSelectedTheme(theme)}
                  className={`w-full text-left p-2 rounded border ${
                    selectedTheme?.type === theme.type && selectedTheme?.field === theme.field
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{theme.field}</div>
                  <div className="text-sm text-gray-500 capitalize">{theme.type}</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedTheme && (
          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium mb-2">{"Theme Details"}</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-gray-500">{"Type:"}</span>{' '}
                <span className="capitalize">{selectedTheme.type}</span>
              </div>
              <div>
                <span className="text-gray-500">{"Field:"}</span> {selectedTheme.field}
              </div>
              {selectedTheme.type === 'categorical' && (
                <>
                  <div>
                    <span className="text-gray-500">{"Categories:"}</span>{' '}
                    {selectedTheme.topValues.length + selectedTheme.otherCount}
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-500">{"Top values:"}</span>
                    <ul className="ml-4 mt-1 space-y-1">
                      {selectedTheme.topValues.slice(0, 5).map((v) => (
                        <li key={v.value}>
                          {v.value} {"("} {v.count} {")"}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {selectedTheme.type === 'boolean' && (
                <>
                  <div>
                    <span className="text-gray-500">{"True:"}</span> {String(selectedTheme.trueValue)}
                  </div>
                  <div>
                    <span className="text-gray-500">{"False:"}</span> {String(selectedTheme.falseValue)}
                  </div>
                </>
              )}
              {selectedTheme.type === 'intensity' && (
                <>
                  <div>
                    <span className="text-gray-500">{"Min:"}</span> {selectedTheme.min}
                  </div>
                  <div>
                    <span className="text-gray-500">{"Max:"}</span> {selectedTheme.max}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <button
          onClick={fitBounds}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {"Fit Bounds"}
        </button>
      </div>

      {/* Map */}
      <div className="flex-1">
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
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#1e40af',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                'circle-color': getCircleColorExpression(selectedTheme) as any,
              }}
            />
          </Source>
        </Map>
      </div>
    </div>
  );
}

const meta: Meta<typeof MapThemesViewer> = {
  title: 'Map/MapThemes',
  component: MapThemesViewer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ParisBusStops: Story = {
  render: () => {
    return <MapThemesViewer features={parisBusStopsData.features} />;
  },
};
