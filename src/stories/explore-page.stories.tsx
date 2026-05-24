import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { StoryShell } from "./story-shell";

const mockAllCities = [
  { id: "paris", name: "Paris", country: "France", datasets: 14, emoji: "🗼" },
  { id: "berlin", name: "Berlin", country: "Germany", datasets: 9, emoji: "🏛" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", datasets: 6, emoji: "🚲" },
  { id: "london", name: "London", country: "UK", datasets: 8, emoji: "🎡" },
  { id: "tokyo", name: "Tokyo", country: "Japan", datasets: 15, emoji: "⛩" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", datasets: 5, emoji: "🐟" },
];

const mockFollowedCities = [
  { id: "paris", name: "Paris", country: "France", newDatasets: 2 },
  { id: "berlin", name: "Berlin", country: "Germany", newDatasets: 1 },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", newDatasets: 0 },
];

const mockFeaturedDatasets = [
  { id: "bicycle-parking", name: "Bicycle Parking", city: "Paris", features: 2340 },
  { id: "bus-stops", name: "Bus Stops", city: "Berlin", features: 4100 },
  { id: "public-fountains", name: "Public Fountains", city: "Amsterdam", features: 890 },
  { id: "green-spaces", name: "Green Spaces", city: "London", features: 1200 },
];

function ExplorePageLoggedOut() {
  const [selectedId, setSelectedId] = useState<string | null>("paris");
  const selected = mockAllCities.find((c) => c.id === selectedId);

  return (
    <StoryShell isLoggedIn={false} pageTitle="Explore">
      <div
        className="flex border-b border-neutral-200 dark:border-neutral-800"
        style={{ height: "calc(100vh - var(--nav-height))" }}
      >
        {/* Left panel — all cities */}
        <aside className="w-[36%] min-w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              All cities
            </p>
            <input
              type="text"
              placeholder="Search cities…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
              readOnly
            />
          </div>
          <nav className="flex-1 py-1">
            {mockAllCities.map((city) => (
              <button
                key={city.id}
                onClick={() => setSelectedId(city.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-b border-neutral-50 dark:border-neutral-800 ${
                  selectedId === city.id
                    ? "bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <span className="text-lg">{city.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      selectedId === city.id
                        ? "text-olive-700 dark:text-olive-400"
                        : "text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    {city.name}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {city.country} · {city.datasets} datasets
                  </p>
                </div>
              </button>
            ))}
          </nav>
          {/* Sign in CTA */}
          <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <p className="text-xs text-neutral-500 mb-2">
              Sign in to follow cities and track changes
            </p>
            <button className="w-full px-4 py-2 text-sm font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-700">
              Sign in
            </button>
          </div>
        </aside>

        {/* Right panel — featured datasets */}
        <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
          <div className="px-7 py-5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
            {selected ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selected.emoji}</span>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {selected.country} · {selected.datasets} datasets
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Featured datasets
              </h2>
            )}
          </div>
          <div className="p-7">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-4">
              Featured datasets
            </p>
            <div className="grid grid-cols-2 gap-3">
              {mockFeaturedDatasets.map((ds) => (
                <div
                  key={ds.id}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {ds.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {ds.city} · {ds.features.toLocaleString()} features
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </StoryShell>
  );
}

function ExplorePageLoggedIn({ hasFollows }: { hasFollows: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>("paris");
  const selected = mockAllCities.find((c) => c.id === selectedId);

  return (
    <StoryShell isLoggedIn={true} pageTitle="Explore">
      <div
        className="flex border-b border-neutral-200 dark:border-neutral-800"
        style={{ height: "calc(100vh - var(--nav-height))" }}
      >
        {/* Left panel */}
        <aside className="w-[36%] min-w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black overflow-y-auto">
          {hasFollows ? (
            <>
              {/* Your cities */}
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Your cities
                  </p>
                  <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-medium">
                    3 updates
                  </span>
                </div>
                {mockFollowedCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => setSelectedId(city.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left mb-1 transition-colors ${
                      selectedId === city.id
                        ? "bg-olive-50 dark:bg-olive-950"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-olive-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 flex-1">
                      {city.name}
                    </p>
                    {city.newDatasets > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-medium">
                        {city.newDatasets} new
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* All cities header */}
              <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  All cities
                </p>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Your cities
              </p>
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg px-4 py-5 text-center">
                <p className="text-sm text-neutral-500">No cities followed yet</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Browse below and click a city to follow it
                </p>
              </div>
            </div>
          )}
          <nav className="flex-1 py-1">
            {mockAllCities.map((city) => (
              <button
                key={city.id}
                onClick={() => setSelectedId(city.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-b border-neutral-50 dark:border-neutral-800 ${
                  selectedId === city.id
                    ? "bg-olive-50 dark:bg-olive-950 border-r-2 border-olive-600"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <span className="text-lg">{city.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      selectedId === city.id
                        ? "text-olive-700 dark:text-olive-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {city.name}
                  </p>
                  <p className="text-xs text-neutral-400">{city.datasets} datasets</p>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right panel */}
        <main className="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-y-auto">
          <div className="px-7 py-5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black">
            {selected && (
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {mockAllCities.find((c) => c.id === selectedId)?.emoji}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {selected.country} · {selected.datasets} datasets
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="p-7">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-4">
              Featured datasets
            </p>
            <div className="grid grid-cols-2 gap-3">
              {mockFeaturedDatasets.map((ds) => (
                <div
                  key={ds.id}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {ds.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {ds.city} · {ds.features.toLocaleString()} features
                  </p>
                  {hasFollows && ds.city === "Paris" && (
                    <span className="inline-block mt-2 text-xs text-green-600 font-medium">
                      Following
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
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
  render: () => <ExplorePageLoggedOut />,
};

export const LoggedIn_WithFollows: StoryObj = {
  name: "Logged in — with followed cities",
  render: () => <ExplorePageLoggedIn hasFollows={true} />,
};

export const LoggedIn_NewUser: StoryObj = {
  name: "Logged in — new user (no follows)",
  render: () => <ExplorePageLoggedIn hasFollows={false} />,
};
