import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MonitorRefreshButton from "@/components/monitor-refresh-button";
import MonitorMap from "@/components/monitor-map";
import { prisma } from "@/lib/db";
import { MonitorSchema, type Monitor } from "@/schemas/monitor";
import type { FeatureCollection } from "geojson";

async function getMonitor(id: string): Promise<Monitor | null> {
  try {
    const rawMonitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: true,
      },
    });

    if (!rawMonitor) return null;

    return MonitorSchema.parse({
      ...rawMonitor,
      geojson: rawMonitor.geojson as FeatureCollection | null,
      bbox: rawMonitor.bbox as number[] | null,
      area: {
        ...rawMonitor.area,
        geojson: rawMonitor.area.geojson as FeatureCollection | null,
      },
    });
  } catch (error) {
    console.error("Error fetching monitor:", error);
    return null;
  }
}

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monitor = await getMonitor(id);

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
                    {monitor.area.countryCode &&
                      ` (${monitor.area.countryCode})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MonitorRefreshButton
                    monitorId={monitor.id}
                    isActive={monitor.isActive}
                  />
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
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm uppercase tracking-wide mb-2">
                    Features
                  </h3>
                  <p className="text-2xl font-bold">
                    {monitor.dataCount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center"></div>
              <MonitorMap monitor={monitor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
