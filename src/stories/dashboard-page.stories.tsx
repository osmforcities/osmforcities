import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StoryShell } from "./story-shell";

// Mock data scoped to user's monitored cities
const recentChangesDatasets = [
  { id: "bicycle-paris", name: "Bicycle Parking", city: "Paris", flag: "🇫🇷", edits: 12 },
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", edits: 8 },
  { id: "atm-tokyo", name: "ATMs", city: "Tokyo", flag: "🇯🇵", edits: 15 },
  { id: "bus-lisbon", name: "Bus Stops", city: "Lisbon", flag: "🇵🇹", edits: 5 },
];

const myMonitoredDatasets = [
  { id: "bicycle-paris", name: "Bicycle Parking", city: "Paris", flag: "🇫🇷", followers: 234 },
  { id: "atm-tokyo", name: "ATMs", city: "Tokyo", flag: "🇯🇵", followers: 198 },
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", followers: 187 },
  { id: "hospital-london", name: "Hospitals", city: "London", flag: "🇬🇧", followers: 156 },
];

const largestDatasets = [
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", features: 38420 },
  { id: "bicycle-paris", name: "Bicycle Parking", city: "Paris", flag: "🇫🇷", features: 1204 },
  { id: "bus-tokyo", name: "Bus Stops", city: "Tokyo", flag: "🇯🇵", features: 980 },
];

const myMonitoredCities = [
  { id: "paris", name: "Paris", flag: "🇫🇷", followers: 412 },
  { id: "tokyo", name: "Tokyo", flag: "🇯🇵", followers: 387 },
  { id: "berlin", name: "Berlin", flag: "🇩🇪", followers: 301 },
];

const recentlyAddedDatasets = [
  { id: "fountains-paris", name: "Public Fountains", city: "Paris", flag: "🇫🇷", added: "2 days ago" },
  { id: "parking-berlin", name: "Bicycle Parking", city: "Berlin", flag: "🇩🇪", added: "5 days ago" },
  { id: "lights-tokyo", name: "Street Lights", city: "Tokyo", flag: "🇯🇵", added: "1 week ago" },
  { id: "markets-lisbon", name: "Markets", city: "Lisbon", flag: "🇵🇹", added: "2 weeks ago" },
];

// Recommended for empty state (from Explore's Featured)
const recommendedDatasets = [
  { id: "bicycle-paris", name: "Bicycle Parking", city: "Paris", flag: "🇫🇷", features: 1204 },
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", features: 38420 },
  { id: "water-lagos", name: "Water Points", city: "Lagos", flag: "🇳🇬", features: 2890 },
  { id: "bus-lisbon", name: "Bus Stops", city: "Lisbon", flag: "🇵🇹", features: 2104 },
];

function DashboardPage() {
  return (
    <StoryShell pageTitle="Dashboard">
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Search */}
          <div className="mb-8">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-neutral-400">🔍</span>
              <span className="text-neutral-400 text-sm">Search your monitored cities and datasets…</span>
            </div>
          </div>

          {/* Banner */}
          <div className="mb-8">
            <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Browse all cities worldwide</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 cursor-pointer">Explore all cities →</span>
            </div>
          </div>

          {/* Recent Changes */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Recent Changes <span className="font-normal text-neutral-400">— in your monitored cities</span>
              </h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {recentChangesDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-xs text-neutral-400 mb-2">{ds.city} {ds.flag}</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ds.name}</div>
                  <div className="text-xs text-olive-600 font-medium">↑ {ds.edits} edits</div>
                </div>
              ))}
            </div>
          </section>

          {/* My Monitored Datasets */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">My Monitored Datasets</h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {myMonitoredDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-xs text-neutral-400 mb-2">{ds.city} {ds.flag}</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ds.name}</div>
                  <div className="text-xs text-neutral-400">{ds.followers} followers</div>
                </div>
              ))}
            </div>
          </section>

          {/* Largest Datasets */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Largest Datasets</h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="flex flex-col gap-2">
              {largestDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{ds.name}</div>
                    <div className="text-xs text-neutral-400">{ds.city} {ds.flag}</div>
                  </div>
                  <div className="text-sm font-semibold text-neutral-500">{ds.features.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>

          {/* My Monitored Cities */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">My Monitored Cities</h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="flex flex-col gap-2">
              {myMonitoredCities.map((city) => (
                <div key={city.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{city.name} {city.flag}</div>
                  <div className="text-xs text-neutral-400">{city.followers} followers</div>
                </div>
              ))}
            </div>
          </section>

          {/* Recently Added */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Recently Added <span className="font-normal text-neutral-400">— in your monitored cities</span>
              </h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {recentlyAddedDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-xs text-neutral-400 mb-2">{ds.city} {ds.flag}</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ds.name}</div>
                  <div className="text-xs text-neutral-400">Added {ds.added}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </StoryShell>
  );
}

function DashboardPageEmpty() {
  return (
    <StoryShell pageTitle="Dashboard">
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Empty State Hero */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-8 bg-white dark:bg-neutral-800 mb-10 text-center">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Start monitoring cities and datasets</h2>
            <p className="text-sm text-neutral-500 mb-6">Follow areas to track changes and see updates here.</p>
            <button className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold px-5 py-2.5 rounded-lg">Browse all cities →</button>
          </div>

          {/* Recommended for you */}
          <section>
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Recommended for you</h2>
            <div className="grid grid-cols-4 gap-4">
              {recommendedDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-xs text-neutral-400 mb-2">{ds.city} {ds.flag}</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ds.name}</div>
                  <div className="text-xs text-neutral-400">{ds.features.toLocaleString()} features</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </StoryShell>
  );
}

const meta: Meta<typeof DashboardPage> = {
  title: "Layout/Pages/Dashboard",
  component: DashboardPage,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  render: () => <DashboardPageEmpty />,
};
