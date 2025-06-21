"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MonitorRefreshButton from "@/components/monitor-refresh-button";
import MonitorMap from "@/components/monitor-map";
import { useState, useEffect } from "react";
import { FeatureCollection } from "geojson";

type Monitor = {
  id: string;
  cityName: string;
  countryCode: string | null;
  isActive: boolean;
  isPublic: boolean;
  lastChecked: Date | null;
  dataCount: number;
  createdAt: Date;
  geojson: FeatureCollection;
  template: {
    id: string;
    name: string;
    category: string;
    description: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  area: {
    id: number;
    name: string;
    countryCode: string | null;
    bounds: string | null;
    geojson: FeatureCollection | null;
  };
};

async function getMonitor(id: string): Promise<Monitor | null> {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/monitors/${id}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching monitor:", error);
    return null;
  }
}

export default function MonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonitor = async () => {
      const { id } = await params;
      const monitorData = await getMonitor(id);
      setMonitor(monitorData);
      setLoading(false);
    };

    fetchMonitor();
  }, [params]);

  const handleRefresh = (newDataCount: number) => {
    if (monitor) {
      setMonitor({
        ...monitor,
        dataCount: newDataCount,
        lastChecked: new Date(),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!monitor) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/my-monitors" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to My Monitors
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {monitor.template.name}
                  </h1>
                  <p className="text-xl text-muted-foreground mt-2">
                    {monitor.cityName}
                    {monitor.countryCode && ` (${monitor.countryCode})`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      monitor.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {monitor.isActive ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm rounded-full capitalize ${
                      monitor.isPublic
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {monitor.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>

              {monitor.template.description && (
                <p className="text-muted-foreground mb-4">
                  {monitor.template.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm uppercase tracking-wide mb-2">
                    Data Count
                  </h3>
                  <p className="text-2xl font-bold">
                    {monitor.dataCount.toLocaleString()}
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm uppercase tracking-wide mb-2">
                    Category
                  </h3>
                  <p className="text-lg capitalize">
                    {monitor.template.category}
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm uppercase tracking-wide mb-2">
                    Last Checked
                  </h3>
                  <p className="text-lg">
                    {monitor.lastChecked
                      ? new Date(monitor.lastChecked).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <MonitorRefreshButton
                  monitorId={monitor.id}
                  isActive={monitor.isActive}
                  onRefresh={handleRefresh}
                />
              </div>
            </div>

            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Monitor Information
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created by:</span>
                  <span>
                    {monitor.user.name || monitor.user.email.split("@")[0]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created on:</span>
                  <span>
                    {new Date(monitor.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monitor ID:</span>
                  <span className="font-mono text-xs">{monitor.id}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Data Visualization</h2>
              <MonitorMap monitor={monitor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
