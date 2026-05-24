import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

const categories = ['All', 'Transportation', 'Nature', 'Financial', 'Healthcare'];

const datasets = [
  { id: 'bicycle-paris', name: 'Bicycle Parking — Paris', category: 'Transportation', area: 'Paris', icon: '🚲', features: 1204, description: 'All bicycle parking spots in the city.' },
  { id: 'trees-berlin', name: 'Urban Trees — Berlin', category: 'Nature', area: 'Berlin', icon: '🌳', features: 38420, description: 'Tree inventory for the Berlin metro area.' },
  { id: 'atms-tokyo', name: 'ATMs — Tokyo', category: 'Financial', area: 'Tokyo', icon: '💰', features: 890, description: 'Cash machines and bank ATMs across Tokyo.' },
  { id: 'hospitals-london', name: 'Hospitals — London', category: 'Healthcare', area: 'London', icon: '🏥', features: 312, description: 'NHS and private hospitals and clinics.' },
  { id: 'bus-lisbon', name: 'Bus Stops — Lisbon', category: 'Transportation', area: 'Lisbon', icon: '🚌', features: 2104, description: 'All Carris and Scotturb bus stops.' },
  { id: 'water-amsterdam', name: 'Drinking Water — Amsterdam', category: 'Nature', area: 'Amsterdam', icon: '💧', features: 87, description: 'Public drinking water fountains.' },
];

function FeaturedDatasetsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedId, setSelectedId] = useState('bicycle-paris');

  const filtered = selectedCategory === 'All' ? datasets : datasets.filter((d) => d.category === selectedCategory);
  const selected = datasets.find((d) => d.id === selectedId)!;

  return (
    <StoryShell>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Featured Datasets</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Curated open data from cities worldwide</p>
        </div>

        {/* Category filter */}
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-olive-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dataset list */}
        <nav className="flex-1 overflow-y-auto py-1">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`w-full flex items-start gap-3 px-6 py-4 text-left transition-colors border-b border-neutral-50 dark:border-neutral-800 ${
                selectedId === d.id
                  ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
              }`}
            >
              <span className="text-xl flex-shrink-0">{d.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${selectedId === d.id ? 'text-olive-700 dark:text-olive-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                  {d.name}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">{d.features.toLocaleString()} features</p>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{selected.icon}</span>
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{selected.name}</h2>
              <p className="text-sm text-neutral-500">{selected.area} · {selected.category}</p>
            </div>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <p className="text-neutral-600 dark:text-neutral-400">{selected.description}</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Features', value: selected.features.toLocaleString() },
              { label: 'Category', value: selected.category },
              { label: 'Area', value: selected.area },
              { label: 'Source', value: 'OpenStreetMap' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">{stat.label}</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-olive-600 text-white rounded-lg text-sm font-medium">
              Use this dataset
            </button>
            <button className="px-5 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400">
              Preview data
            </button>
          </div>
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof FeaturedDatasetsPage> = {
  title: 'Layout/Pages/FeaturedDatasets',
  component: FeaturedDatasetsPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
