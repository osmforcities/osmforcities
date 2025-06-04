import { Metadata } from "next";
import PublicMonitorsFeed from "./components/public-monitors-feed";

export const metadata: Metadata = {
  title: "OSM for Cities - Monitor OpenStreetMap Datasets",
  description: "Monitor OpenStreetMap datasets across cities worldwide",
};

// Main home page component
export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center p-4 py-16">
        <div className="w-full max-w-2xl text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-white mb-4">
              Monitor OpenStreetMap Datasets
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Track changes in bicycle parking, bus stops, hospitals, and more
              across cities worldwide. Get insights into urban infrastructure
              development.
            </p>
          </div>
        </div>
      </div>

      {/* Public Monitors Feed */}
      <div
        id="public-monitors"
        className="border-t border-gray-200 dark:border-gray-800 py-8"
      >
        <PublicMonitorsFeed />
      </div>
    </div>
  );
}
