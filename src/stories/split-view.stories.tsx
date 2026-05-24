import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { HeroLayout } from '@/components/home/hero/hero-layout';
import { StoryShell } from './story-shell';

const mockCategories = [
  { id: 'nature', name: 'Nature', icon: '🌳', count: 4 },
  { id: 'transportation', name: 'Transportation', icon: '🚲', count: 3 },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', count: 3 },
  { id: 'financial', name: 'Financial', icon: '💰', count: 2 },
  { id: 'education', name: 'Education', icon: '🎓', count: 2 },
];

const mockTemplates = {
  nature: [
    { id: 'urban-trees', name: 'Urban Trees', description: 'All trees and tree rows', isSpecialized: false },
    { id: 'urban-green', name: 'Urban Green Spaces', description: 'Parks and gardens', isSpecialized: false },
    { id: 'street-trees', name: 'Street Trees', description: 'Trees along streets', isSpecialized: true },
    { id: 'trees-with-species', name: 'Trees with Species', description: 'Species data included', isSpecialized: true },
  ],
  transportation: [
    { id: 'bicycle-parking', name: 'Bicycle Parking', description: 'Bike parking spots', isSpecialized: false },
    { id: 'bus-stops', name: 'Bus Stops', description: 'Public bus stops', isSpecialized: false },
    { id: 'bicycle-rental', name: 'Bicycle Rental', description: 'Bike sharing stations', isSpecialized: true },
  ],
  healthcare: [
    { id: 'hospitals', name: 'Hospitals', description: 'Medical centers', isSpecialized: false },
    { id: 'clinics', name: 'Clinics', description: 'Health clinics', isSpecialized: false },
    { id: 'pharmacies', name: 'Pharmacies', description: 'Drug stores', isSpecialized: false },
  ],
  financial: [
    { id: 'atms', name: 'ATMs', description: 'Cash machines', isSpecialized: false },
    { id: 'banks', name: 'Banks', description: 'Bank branches', isSpecialized: false },
  ],
  education: [
    { id: 'schools', name: 'Schools', description: 'K-12 schools', isSpecialized: false },
    { id: 'universities', name: 'Universities', description: 'Higher education', isSpecialized: false },
  ],
};

function SplitView() {
  const [selectedCategory, setSelectedCategory] = useState<string>('nature');
  const [showSpecialized, setShowSpecialized] = useState(false);
  const templates = mockTemplates[selectedCategory as keyof typeof mockTemplates] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Paris</h1>
          <p className="text-gray-600">Browse available datasets</p>
        </div>
      </div>

      {/* Split layout */}
      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - Categories */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-120px)] p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Categories</h2>
          <nav className="space-y-1">
            {mockCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setShowSpecialized(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-olive-100 text-olive-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{category.icon}</span>
                <span className="flex-1">{category.name}</span>
                <span className={`text-sm ${selectedCategory === category.id ? 'text-olive-600' : 'text-gray-400'}`}>
                  {category.count}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main - Templates */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{mockCategories.find((c) => c.id === selectedCategory)?.icon}</span>
              <h2 className="text-2xl font-semibold text-gray-900 capitalize">{selectedCategory}</h2>
            </div>
            <p className="text-gray-600">{templates.length} datasets available</p>
          </div>

          {/* Broad templates */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Broader options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.filter((t) => !t.isSpecialized).map((template) => (
                <button
                  key={template.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow text-left"
                >
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Specialized templates */}
          {templates.some((t) => t.isSpecialized) && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Specialized options</h3>
                <button
                  onClick={() => setShowSpecialized(!showSpecialized)}
                  className="text-sm text-olive-600 hover:text-olive-700 font-medium"
                >
                  {showSpecialized ? 'Hide' : 'Show'}
                </button>
              </div>
              {showSpecialized ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.filter((t) => t.isSpecialized).map((template) => (
                    <button
                      key={template.id}
                      className="bg-olive-50/50 rounded-lg p-4 border border-olive-200 hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-olive-100 text-olive-700">Specialized</span>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500">
                    {templates.filter((t) => t.isSpecialized).length} specialized options available
                  </p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

const meta: Meta<typeof SplitView> = {
  title: 'Prototype/SamePage/SplitView',
  component: SplitView,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function HomeHeroMock() {
  return (
    <StoryShell>
    <HeroLayout>
      <div className="flex flex-col justify-center md:border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black py-4 px-3 md:py-16 md:px-14">
        <div style={{ maxWidth: '480px' }}>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-3">Canonical reference</p>
          <h1 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4" style={{ fontSize: 'clamp(18px, 5vw, 32px)', lineHeight: '1.1', letterSpacing: '-0.025em' }}>
            OSM for Cities
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400" style={{ fontSize: 'clamp(13px, 2.5vw, 15px)', lineHeight: '1.5' }}>
            OpenStreetMap data for your city, organized into datasets you can monitor and export.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="px-5 py-2.5 bg-olive-600 text-white rounded-lg text-sm font-medium">See how it works</button>
          </div>
          <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400 space-y-1">
            <p>Left panel: ~42% width</p>
            <p>Right panel: ~58% — map or strong visual</p>
            <p>Height: 100vh − nav-height</p>
            <p>Border: border-neutral-200 between panels</p>
          </div>
        </div>
      </div>
      <div className="bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center text-neutral-400">
          <div className="text-4xl mb-3">🗺</div>
          <p className="text-sm">Interactive map</p>
          <p className="text-xs mt-1">Right panel — 58% of viewport</p>
        </div>
      </div>
    </HeroLayout>
    </StoryShell>
  );
}

export const HomeHero: StoryObj<typeof meta> = {
  render: () => <HomeHeroMock />,
};
