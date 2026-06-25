import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StoryShell } from "./story-shell";

// Mock data for stacked-rows layout
const featuredDatasets = [
  { id: "bicycle-paris", name: "Bicycle Parking", city: "Paris", flag: "🇫🇷", features: 1204 },
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", features: 38420 },
  { id: "water-lagos", name: "Water Points", city: "Lagos", flag: "🇳🇬", features: 2890 },
  { id: "bus-lisbon", name: "Bus Stops", city: "Lisbon", flag: "🇵🇹", features: 2104 },
];

const mostActiveDatasets = [
  { id: "water-lagos", name: "Water Points", city: "Lagos", flag: "🇳🇬", edits: 42 },
  { id: "bus-mumbai", name: "Bus Stops", city: "Mumbai", flag: "🇮🇳", edits: 38 },
  { id: "bike-saopaulo", name: "Bike Lanes", city: "São Paulo", flag: "🇧🇷", edits: 31 },
  { id: "hospital-cairo", name: "Hospitals", city: "Cairo", flag: "🇪🇬", edits: 27 },
];

const mostMonitoredDatasets = [
  { id: "bicycle-paris", name: "Bicycle Parking", city: "Paris", flag: "🇫🇷", followers: 234 },
  { id: "atm-tokyo", name: "ATMs", city: "Tokyo", flag: "🇯🇵", followers: 198 },
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", followers: 187 },
  { id: "hospital-london", name: "Hospitals", city: "London", flag: "🇬🇧", followers: 156 },
];

const largestDatasets = [
  { id: "trees-berlin", name: "Urban Trees", city: "Berlin", flag: "🇩🇪", features: 38420 },
  { id: "bus-istanbul", name: "Bus Stops", city: "Istanbul", flag: "🇹🇷", features: 24100 },
  { id: "lights-seoul", name: "Street Lights", city: "Seoul", flag: "🇰🇷", features: 19840 },
];

const mostMonitoredCities = [
  { id: "paris", name: "Paris", flag: "🇫🇷", followers: 412 },
  { id: "tokyo", name: "Tokyo", flag: "🇯🇵", followers: 387 },
  { id: "nairobi", name: "Nairobi", flag: "🇰🇪", followers: 301 },
];

const recentlyAddedDatasets = [
  { id: "ciclovia-bogota", name: "Ciclovías", city: "Bogotá", flag: "🇨🇴", added: "2 days ago" },
  { id: "markets-accra", name: "Markets", city: "Accra", flag: "🇬🇭", added: "5 days ago" },
  { id: "flood-jakarta", name: "Flood Sensors", city: "Jakarta", flag: "🇮🇩", added: "1 week ago" },
  { id: "clinics-kampala", name: "Health Clinics", city: "Kampala", flag: "🇺🇬", added: "2 weeks ago" },
];

function ExplorePage({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <StoryShell isLoggedIn={isLoggedIn} pageTitle="Explore">
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Search */}
          <div className="mb-8">
            <div className="bg-white border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-neutral-400">🔍</span>
              <span className="text-neutral-400 text-sm">Search cities and datasets…</span>
            </div>
          </div>

          {/* Banner: logged in only */}
          {isLoggedIn && (
            <div className="mb-8">
              <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">See your personalized activity</span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 cursor-pointer">Your Dashboard →</span>
              </div>
            </div>
          )}

          {/* Featured */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Featured</h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {featuredDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-xs text-neutral-400 mb-2">{ds.city} {ds.flag}</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ds.name}</div>
                  <div className="text-xs text-neutral-400">{ds.features.toLocaleString()} features</div>
                </div>
              ))}
            </div>
          </section>

          {/* Most Active */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Most Active <span className="font-normal text-neutral-400">— last 30 days</span>
              </h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {mostActiveDatasets.map((ds) => (
                <div key={ds.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-xs text-neutral-400 mb-2">{ds.city} {ds.flag}</div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{ds.name}</div>
                  <div className="text-xs text-olive-600 font-medium">↑ {ds.edits} edits</div>
                </div>
              ))}
            </div>
          </section>

          {/* Most Monitored */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Most Monitored</h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {mostMonitoredDatasets.map((ds) => (
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

          {/* Most Monitored Cities */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Most Monitored Cities</h2>
              <span className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">See all →</span>
            </div>
            <div className="flex flex-col gap-2">
              {mostMonitoredCities.map((city) => (
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
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Recently Added</h2>
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

          {/* Sign-in CTA (logged out only) */}
          {!isLoggedIn && (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-5 bg-white dark:bg-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Follow cities and datasets</div>
                <div className="text-xs text-neutral-500">Sign in to track changes and get notified when data updates.</div>
              </div>
              <button className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold px-4 py-2.5 rounded-lg whitespace-nowrap ml-4">Sign in</button>
            </div>
          )}
        </div>
      </div>
    </StoryShell>
  );
}

const meta: Meta = {
  title: "Layout/Pages/Explore",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const LoggedOut: StoryObj = {
  name: "Logged out",
  render: () => <ExplorePage isLoggedIn={false} />,
};

export const LoggedIn: StoryObj = {
  name: "Logged in",
  render: () => <ExplorePage isLoggedIn={true} />,
};
