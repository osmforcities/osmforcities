import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

// Aspirational layout for the Explore page (sprint #257 — not yet implemented)

const mockResults = [
  { id: 'paris', name: 'Paris', country: 'France', population: '2.1M', datasets: 12, emoji: '🗼' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', population: '3.7M', datasets: 8, emoji: '🏛' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', population: '14M', datasets: 15, emoji: '⛩' },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', population: '545K', datasets: 5, emoji: '🐟' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', population: '921K', datasets: 9, emoji: '🚲' },
];

function ExplorePage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('paris');

  const filtered = query
    ? mockResults.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.country.toLowerCase().includes(query.toLowerCase()))
    : mockResults;

  const selected = mockResults.find((r) => r.id === selectedId);

  return (
    <StoryShell>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Explore</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Find cities and their open datasets</p>
        </div>
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <input
            type="text"
            placeholder="Search cities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
          />
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-neutral-400 text-center">No cities found</p>
          ) : (
            filtered.map((result) => (
              <button
                key={result.id}
                onClick={() => setSelectedId(result.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors border-b border-neutral-50 dark:border-neutral-800 ${
                  selectedId === result.id
                    ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <span className="text-xl">{result.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${selectedId === result.id ? 'text-olive-700 dark:text-olive-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                    {result.name}
                  </p>
                  <p className="text-xs text-neutral-400">{result.country} · {result.datasets} datasets</p>
                </div>
              </button>
            ))
          )}
        </nav>
      </aside>

      {/* Right panel — aspirational: map or detail view */}
      <main className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900">
        {selected ? (
          <>
            <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selected.emoji}</span>
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{selected.name}</h2>
                  <p className="text-sm text-neutral-500">{selected.country} · {selected.population} residents</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-neutral-400">
                <div className="text-5xl mb-4">🗺</div>
                <p className="text-sm font-medium">City map</p>
                <p className="text-xs mt-1">{selected.datasets} datasets available</p>
                <button className="mt-6 px-5 py-2.5 bg-olive-600 text-white rounded-lg text-sm font-medium">
                  Explore {selected.name}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400">
            <p className="text-sm">Select a city to explore</p>
          </div>
        )}
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof ExplorePage> = {
  title: 'Layout/Pages/Explore',
  component: ExplorePage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Aspirational layout — informs sprint #257
export const Default: Story = {};
