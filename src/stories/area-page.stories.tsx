import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StoryShell } from './story-shell';

// Mock data - all templates flat (current state)
const mockAllTemplates = [
  { id: 'urban-trees', name: 'Urban Trees', description: 'All trees and tree rows', category: 'nature' },
  { id: 'street-trees', name: 'Street Trees', description: 'Trees along streets', category: 'nature' },
  { id: 'trees-with-species', name: 'Trees with Species', description: 'Trees with species data', category: 'nature' },
  { id: 'urban-green', name: 'Urban Green Spaces', description: 'Parks and gardens', category: 'nature' },
  { id: 'irrigated-green', name: 'Irrigated Green', description: 'Irrigated areas', category: 'nature' },
  { id: 'bicycle-parking', name: 'Bicycle Parking', description: 'Bike parking spots', category: 'transportation' },
  { id: 'bicycle-rental', name: 'Bicycle Rental', description: 'Bike sharing stations', category: 'transportation' },
  { id: 'bus-stops', name: 'Bus Stops', description: 'Public bus stops', category: 'transportation' },
  { id: 'railway-stations', name: 'Railway Stations', description: 'Train stations', category: 'transportation' },
  { id: 'atms', name: 'ATMs', description: 'Cash machines', category: 'financial' },
  { id: 'banks', name: 'Banks', description: 'Bank branches', category: 'financial' },
  { id: 'schools', name: 'Schools', description: 'K-12 schools', category: 'education' },
  { id: 'hospitals', name: 'Hospitals', description: 'Medical centers', category: 'healthcare' },
  { id: 'clinics', name: 'Clinics', description: 'Health clinics', category: 'healthcare' },
  { id: 'hotels', name: 'Hotels', description: 'Accommodations', category: 'tourism' },
];

const categoryIcons: Record<string, string> = {
  nature: '🌳',
  transportation: '🚲',
  financial: '💰',
  education: '🎓',
  healthcare: '🏥',
  tourism: '📷',
};

function CurrentAreaPage({ templates }: { templates: typeof mockAllTemplates }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  const categoryCounts = templates.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Area info placeholder */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Paris</h1>
          <p className="text-gray-600">Browse available datasets for this area</p>
        </div>

        {/* Search and filter */}
        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-olive-500 focus:border-transparent"
          />

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-olive-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {cat === 'all' ? `All (${templates.length})` : `${cat} (${categoryCounts[cat] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'dataset' : 'datasets'} available
          </p>
        </div>

        {/* Template grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No datasets found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-olive-100 text-olive-600 rounded-lg">
                    {categoryIcons[template.category] || '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-olive-700 truncate">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">{template.category}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Browse CTA for hybrid approach */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-olive-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Too many options?</h3>
              <p className="text-sm text-gray-600">Browse by category instead</p>
            </div>
            <button className="px-4 py-2 bg-olive-600 text-white rounded-lg font-medium hover:bg-olive-700 transition-colors">
              Browse by category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof CurrentAreaPage> = {
  title: 'Prototype/Current/CurrentAreaPage',
  component: CurrentAreaPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTemplates: Story = {
  args: {
    templates: mockAllTemplates,
  },
};

export const FilteredByCategory: Story = {
  args: {
    templates: mockAllTemplates,
  },
  render: (args) => {
    // Pre-filtered to show category state
    const filtered = args.templates.filter((t) => t.category === 'nature');
    return <CurrentAreaPage templates={filtered} />;
  },
};

export const ManyTemplates: Story = {
  args: {
    templates: Array.from({ length: 50 }, (_, i) => ({
      id: `template-${i}`,
      name: `Template ${i + 1}`,
      description: 'A dataset template for tracking urban features',
      category: ['nature', 'transportation', 'financial', 'education', 'healthcare'][i % 5],
    })),
  },
};

// Aspirational split-view layout for the area page
const mockSidebarTemplates = [
  { id: 'bicycle-parking', name: 'Bicycle Parking', category: 'transportation', icon: '🚲', featureCount: 1204, updatedDaysAgo: 2 },
  { id: 'urban-trees', name: 'Urban Trees', category: 'nature', icon: '🌳', featureCount: 38420, updatedDaysAgo: 1 },
  { id: 'drinking-water', name: 'Drinking Water', category: 'nature', icon: '💧', featureCount: 312, updatedDaysAgo: 5 },
  { id: 'atms', name: 'ATMs', category: 'financial', icon: '💰', featureCount: 890, updatedDaysAgo: 3 },
  { id: 'bus-stops', name: 'Bus Stops', category: 'transportation', icon: '🚌', featureCount: 2104, updatedDaysAgo: 7 },
];

function AspirationalAreaPage() {
  const [selectedId, setSelectedId] = useState('bicycle-parking');
  const selected = mockSidebarTemplates.find((t) => t.id === selectedId)!;

  return (
    <StoryShell pageTitle="Paris">
    <div
      className="flex border-b border-neutral-200 dark:border-neutral-800"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      {/* Left panel */}
      <aside className="w-[36%] min-w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Paris</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{mockSidebarTemplates.length} active datasets</p>
        </div>
        <nav className="flex-1 py-2">
          {mockSidebarTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                selectedId === t.id
                  ? 'bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${selectedId === t.id ? 'text-olive-700 dark:text-olive-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                  {t.name}
                </p>
                <p className="text-xs text-neutral-400">{t.featureCount.toLocaleString()} features</p>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{selected.icon}</span>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{selected.name}</h2>
          </div>
          <p className="text-sm text-neutral-500">Updated {selected.updatedDaysAgo} day{selected.updatedDaysAgo !== 1 ? 's' : ''} ago · {selected.featureCount.toLocaleString()} features</p>
        </div>
        <div className="flex-1 p-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-5">
              <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-600 rounded mb-2" />
              <div className="h-3 w-48 bg-neutral-100 dark:bg-neutral-700 rounded" />
            </div>
          ))}
          <button className="mt-4 px-5 py-2.5 bg-olive-600 text-white rounded-lg text-sm font-medium">
            View dataset →
          </button>
        </div>
      </main>
    </div>
    </StoryShell>
  );
}

export const SplitLayout: StoryObj<typeof meta> = {
  render: () => <AspirationalAreaPage />,
};
