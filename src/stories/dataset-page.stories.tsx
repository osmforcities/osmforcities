import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

const mockFeatures = [
  { id: 1, name: 'Vélo\'V Station #42', tags: 'amenity=bicycle_parking', lat: 48.8566, lon: 2.3522 },
  { id: 2, name: 'Parking Rivoli', tags: 'amenity=bicycle_parking; capacity=20', lat: 48.8601, lon: 2.3477 },
  { id: 3, name: 'Station Châtelet', tags: 'amenity=bicycle_parking; covered=yes', lat: 48.8583, lon: 2.3471 },
  { id: 4, name: 'Parking Bastille', tags: 'amenity=bicycle_parking; access=public', lat: 48.8533, lon: 2.3692 },
  { id: 5, name: 'Station Marais', tags: 'amenity=bicycle_parking; fee=no', lat: 48.8571, lon: 2.3574 },
  { id: 6, name: 'Parking Opéra', tags: 'amenity=bicycle_parking; capacity=12', lat: 48.8702, lon: 2.3318 },
];

function DatasetPage() {
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const selected = mockFeatures.find((f) => f.id === selectedId);

  return (
    <StoryShell>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel — 40% for map pages */}
      <aside className="w-[40%] min-w-64 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-400 mb-1">Paris · Transportation</p>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Bicycle Parking</h1>
          <p className="text-sm text-neutral-500 mt-0.5">1,204 features · Updated 2 days ago</p>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <input
            type="text"
            placeholder="Search features..."
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
            readOnly
          />
        </div>

        {/* Feature list */}
        <nav className="flex-1 overflow-y-auto py-1">
          {mockFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setSelectedId(feature.id)}
              className={`w-full flex items-start gap-3 px-6 py-3 text-left transition-colors border-b border-neutral-50 dark:border-neutral-800 ${
                selectedId === feature.id
                  ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-olive-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${selectedId === feature.id ? 'text-olive-700 dark:text-olive-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                  {feature.name}
                </p>
                <p className="text-xs text-neutral-400 truncate">{feature.tags}</p>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Right panel — map */}
      <main className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-neutral-400">
            <div className="text-5xl mb-4">🗺</div>
            <p className="text-sm font-medium">Dataset map</p>
            <p className="text-xs mt-1">1,204 bicycle parking features</p>
            {selected && (
              <div className="mt-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-left max-w-xs">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{selected.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{selected.tags}</p>
                <p className="text-xs text-neutral-400">{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof DatasetPage> = {
  title: 'Layout/Pages/Dataset',
  component: DatasetPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
