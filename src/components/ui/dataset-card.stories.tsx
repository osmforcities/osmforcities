import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DatasetCard } from "./dataset-card";

const meta: Meta<typeof DatasetCard> = {
  title: "UI/DatasetCard",
  component: DatasetCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "Bicycle Parking",
    city: "Paris",
    country: "france",
    category: "transportation",
    features: 1204,
    href: "/area/paris/dataset/bicycle-paris",
  },
};

export const WithStats: Story = {
  args: {
    name: "Hospitals",
    city: "London",
    country: "united kingdom",
    category: "healthcare",
    features: 312,
    href: "/area/london/dataset/hospitals-london",
    stats: [
      { label: "Contributors", value: "12" },
      { label: "Last updated", value: "2 days ago" },
    ],
  },
};

export const LargeNumbers: Story = {
  args: {
    name: "Urban Trees",
    city: "Berlin",
    country: "germany",
    category: "nature",
    features: 38420,
    href: "/area/berlin/dataset/trees-berlin",
  },
};

export const DarkMode: Story = {
  args: {
    name: "Bicycle Parking",
    city: "Paris",
    country: "france",
    category: "transportation",
    features: 1204,
    href: "/area/paris/dataset/bicycle-paris",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};

// Grid showcase for different contexts
export const GridShowcase: Story = {
  args: {},
  render: () => (
    <div className="space-y-8 p-6 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
      {/* Default grid - for Featured Datasets page */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          {"Featured Datasets"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DatasetCard
            name="Bicycle Parking"
            city="Paris"
            country="france"
            category="transportation"
            features={1204}
            href="/area/paris/dataset/bicycle-paris"
          />
          <DatasetCard
            name="Urban Trees"
            city="Berlin"
            country="germany"
            category="nature"
            features={38420}
            href="/area/berlin/dataset/trees-berlin"
          />
          <DatasetCard
            name="ATMs"
            city="Tokyo"
            country="japan"
            category="financial"
            features={890}
            href="/area/tokyo/dataset/atms-tokyo"
          />
        </div>
      </div>

      {/* With stats - for Dashboard */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          {"Dashboard (With stats)"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatasetCard
            name="Schools"
            city="Berlin"
            country="germany"
            category="education"
            href="/area/berlin/dataset/schools-berlin"
            stats={[
              { label: "Contributors", value: "15" },
              { label: "Last updated", value: "1 day ago" },
            ]}
          />
          <DatasetCard
            name="Bicycle Parking"
            city="Paris"
            country="france"
            category="transportation"
            features={1204}
            href="/area/paris/dataset/bicycle-paris"
            stats={[
              { label: "Contributors", value: "8" },
              { label: "Last updated", value: "3 days ago" },
            ]}
          />
        </div>
      </div>

      {/* Various cities and categories */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          {"Various Cities & Categories"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DatasetCard
            name="Schools"
            city="Santa Rita do Passa Quatro"
            country="brazil"
            category="education"
            features={45}
            href="/area/santa-rita-do-passa-quatro/dataset/schools-santa-rita"
            stats={[
              { label: "Contributors", value: "12" },
              { label: "Last updated", value: "1 week ago" },
            ]}
          />
          <DatasetCard
            name="Hospitals"
            city="San Francisco"
            country="united states"
            category="healthcare"
            features={312}
            href="/area/san-francisco/dataset/hospitals-san-francisco"
            stats={[
              { label: "Contributors", value: "28" },
              { label: "Last updated", value: "4 days ago" },
            ]}
          />
          <DatasetCard
            name="Public Transport"
            city="New York City"
            country="united states"
            category="transportation"
            features={1247}
            href="/area/new-york-city/dataset/transport-new-york"
            stats={[
              { label: "Contributors", value: "45" },
              { label: "Last updated", value: "2 days ago" },
            ]}
          />
        </div>
      </div>
    </div>
  ),
};
