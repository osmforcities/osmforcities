import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

const mockAreas = [
  { id: 'paris', name: 'Paris', country: 'France', datasets: 5, updatedDaysAgo: 1 },
  { id: 'berlin', name: 'Berlin', country: 'Germany', datasets: 3, updatedDaysAgo: 3 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', datasets: 7, updatedDaysAgo: 0 },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', datasets: 2, updatedDaysAgo: 14 },
];

const mockActivity = [
  { area: 'Tokyo', template: 'Bicycle Parking', time: '2 hours ago' },
  { area: 'Paris', template: 'Urban Trees', time: 'Yesterday' },
  { area: 'Berlin', template: 'ATMs', time: '3 days ago' },
  { area: 'Tokyo', template: 'Bus Stops', time: '5 days ago' },
];

function DashboardPage() {
  const [selectedId, setSelectedId] = useState('paris');
  const selected = mockAreas.find((a) => a.id === selectedId)!;

  return (
    <StoryShell>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Your areas</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{mockAreas.length} monitored</p>
        </div>
        <nav className="flex-1 py-2">
          {mockAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedId(area.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                selectedId === area.id
                  ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${selectedId === area.id ? 'text-olive-700 dark:text-olive-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                  {area.name}
                </p>
                <p className="text-xs text-neutral-400">{area.country} · {area.datasets} datasets</p>
              </div>
              {area.updatedDaysAgo === 0 && (
                <span className="w-2 h-2 rounded-full bg-olive-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800">
          <button className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
            + Add area
          </button>
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{selected.name}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{selected.country} · {selected.datasets} active datasets</p>
        </div>
        <div className="p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Datasets', value: selected.datasets },
              { label: 'Features', value: '42.3k' },
              { label: 'Last update', value: selected.updatedDaysAgo === 0 ? 'Today' : `${selected.updatedDaysAgo}d ago` },
            ].map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Recent activity</h3>
            <div className="space-y-2">
              {mockActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">
                      <span className="font-medium">{item.area}</span> · {item.template}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof DashboardPage> = {
  title: 'Layout/Pages/Dashboard',
  component: DashboardPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
