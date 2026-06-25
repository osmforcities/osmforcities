import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

const categories = [
  { id: 'transportation', label: 'Transportation', icon: '🚲', count: 6 },
  { id: 'nature', label: 'Nature', icon: '🌳', count: 5 },
  { id: 'financial', label: 'Financial', icon: '💰', count: 3 },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥', count: 4 },
  { id: 'education', label: 'Education', icon: '🎓', count: 2 },
  { id: 'tourism', label: 'Tourism', icon: '📷', count: 3 },
];

const templates: Record<string, { id: string; name: string; description: string }[]> = {
  transportation: [
    { id: 'bicycle-parking', name: 'Bicycle Parking', description: 'Bike parking spots and racks' },
    { id: 'bicycle-rental', name: 'Bicycle Rental', description: 'Bike sharing stations' },
    { id: 'bus-stops', name: 'Bus Stops', description: 'Public bus stops' },
    { id: 'railway-stations', name: 'Railway Stations', description: 'Train and metro stations' },
    { id: 'charging-stations', name: 'EV Charging', description: 'Electric vehicle charging' },
    { id: 'taxi-stands', name: 'Taxi Stands', description: 'Official taxi pickup zones' },
  ],
  nature: [
    { id: 'urban-trees', name: 'Urban Trees', description: 'All trees and tree rows' },
    { id: 'drinking-water', name: 'Drinking Water', description: 'Public drinking water sources' },
    { id: 'urban-green', name: 'Urban Green Spaces', description: 'Parks and gardens' },
    { id: 'street-trees', name: 'Street Trees', description: 'Trees along streets' },
    { id: 'benches', name: 'Benches', description: 'Public seating' },
  ],
  financial: [
    { id: 'atms', name: 'ATMs', description: 'Cash machines' },
    { id: 'banks', name: 'Banks', description: 'Bank branches' },
    { id: 'currency-exchange', name: 'Currency Exchange', description: 'Money exchange offices' },
  ],
  healthcare: [
    { id: 'hospitals', name: 'Hospitals', description: 'Medical centers and hospitals' },
    { id: 'clinics', name: 'Clinics', description: 'Health clinics' },
    { id: 'pharmacies', name: 'Pharmacies', description: 'Drug stores' },
    { id: 'dentists', name: 'Dentists', description: 'Dental practices' },
  ],
  education: [
    { id: 'schools', name: 'Schools', description: 'K-12 schools' },
    { id: 'universities', name: 'Universities', description: 'Higher education institutions' },
  ],
  tourism: [
    { id: 'hotels', name: 'Hotels', description: 'Accommodations' },
    { id: 'museums', name: 'Museums', description: 'Museums and galleries' },
    { id: 'viewpoints', name: 'Viewpoints', description: 'Scenic viewpoints' },
  ],
};

function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState('transportation');
  const current = templates[selectedCategory] ?? [];
  const cat = categories.find((c) => c.id === selectedCategory)!;

  return (
    <StoryShell>
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-56 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Templates</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Browse by category</p>
        </div>
        <nav className="flex-1 py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className={`flex-1 text-sm font-medium ${selectedCategory === cat.id ? 'text-olive-700 dark:text-olive-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                {cat.label}
              </span>
              <span className="text-xs text-neutral-400">{cat.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{cat.icon}</span>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{cat.label}</h2>
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">{current.length} templates available</p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {current.map((t) => (
              <button
                key={t.id}
                className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 text-left hover:shadow-sm transition-shadow group"
              >
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-olive-700 dark:group-hover:text-olive-400">
                  {t.name}
                </h3>
                <p className="text-sm text-neutral-500 mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

const meta: Meta<typeof TemplatesPage> = {
  title: 'Layout/Pages/Templates',
  component: TemplatesPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
