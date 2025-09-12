"use client";

import { GridList, GridListItem } from "react-aria-components";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCategoryIcon } from "@/lib/category-icons";

type Dataset = {
  id: string;
  cityName: string;
  isActive: boolean;
  dataCount: number;
  template: {
    id: string;
    name: string;
    category: string;
  };
  area: {
    id: number;
    countryCode: string | null;
  };
  _count?: {
    watchers: number;
  };
};

type DashboardGridProps = {
  datasets: Dataset[];
};

/**
 * Client-side grid component for displaying followed datasets
 * @param datasets - Array of dataset objects to display
 * @example
 * <DashboardGrid datasets={watchedDatasets} />
 */
export function DashboardGrid({ datasets }: DashboardGridProps) {
  if (datasets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 text-gray-300 mb-4">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {"No datasets followed yet"}
          </h3>
          <p className="text-gray-600 max-w-md mb-6">
            {"Start following datasets to see them here. "}
            {"Search for cities to discover available datasets."}
          </p>
          <div className="flex gap-3">
            <Button size="sm" asChild>
              <Link href="/search">{"Search Cities"}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600">
          {datasets.length} {"dataset"}
          {datasets.length !== 1 ? "s" : ""} {"you're monitoring"}
        </p>
      </div>

      <GridList
        items={datasets}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="followed-datasets-grid"
      >
        {(dataset) => (
          <GridListItem key={dataset.id} className="group h-full">
            <Card
              href={`/area/${dataset.area.id}/dataset/${dataset.template.id}`}
              description={`${dataset.template.category} dataset for ${dataset.cityName}`}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-olive-100 text-olive-600 rounded-lg">
                    {getCategoryIcon(dataset.template.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-olive-700">
                      {dataset.template.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {dataset.cityName}
                      {dataset.area.countryCode &&
                        ` (${dataset.area.countryCode})`}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardFooter>
                <div className="flex flex-wrap gap-2 w-full">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                    {dataset.template.category}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      dataset.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {dataset.isActive ? "Active" : "Inactive"}
                  </span>
                  {dataset._count && dataset._count.watchers > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                      {dataset._count.watchers} {"watcher"}
                      {dataset._count.watchers !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>
          </GridListItem>
        )}
      </GridList>
    </div>
  );
}
