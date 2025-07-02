"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

import { Dataset, Template, Area } from "@prisma/client";
import { useDatasetActions } from "@/hooks/useDatasetActions";

type DatasetWithTemplateAndArea = Dataset & {
  template: Template;
  area: Area;
  _count: {
    watchers: number;
  };
  canDelete: boolean;
};

type DatasetsListProps = {
  datasets: DatasetWithTemplateAndArea[];
};

export default function DatasetsList({ datasets }: DatasetsListProps) {
  const { deletingId, handleDelete, toggleActive, togglePublic } =
    useDatasetActions();
  const neverText = "Never";

  if (datasets.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No datasets created yet.</p>
        <p className="text-sm mt-2">
          Click the "Create New Dataset" button to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {datasets.map((dataset) => (
        <div key={dataset.id} className="border border-gray-300 p-4 rounded">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">
                {dataset.template.name} in {dataset.cityName}
                {dataset.area.countryCode && ` (${dataset.area.countryCode})`}
              </h3>
              <p className="text-sm text-gray-600 capitalize">
                Category: {dataset.template.category}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  dataset.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {dataset.isActive ? "Active" : "Inactive"}
              </span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  dataset.isPublic
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {dataset.isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-3">
            <p>Data count: {dataset.dataCount}</p>
            <p>
              Last checked:{" "}
              {dataset.lastChecked
                ? new Date(dataset.lastChecked).toLocaleDateString()
                : neverText}
            </p>
            <p>Created: {new Date(dataset.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="flex space-x-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/dataset/${dataset.id}`}>View</Link>
            </Button>
            <button
              onClick={() => toggleActive(dataset.id, dataset.isActive)}
              className="px-3 py-1 text-sm border border-black hover:bg-black hover:text-white transition-colors"
            >
              {dataset.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => togglePublic(dataset.id, dataset.isPublic)}
              className="px-3 py-1 text-sm border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
            >
              {dataset.isPublic ? "Make Private" : "Make Public"}
            </button>
            {dataset.canDelete ? (
              <button
                onClick={() => handleDelete(dataset.id)}
                disabled={deletingId === dataset.id}
                className="px-3 py-1 text-sm border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
              >
                {deletingId === dataset.id ? "Deleting..." : "Delete"}
              </button>
            ) : (
              <button
                disabled
                title={`Cannot delete dataset with ${dataset._count.watchers} watcher(s). Make it private first or ask watchers to unwatch it.`}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-400 cursor-not-allowed"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
