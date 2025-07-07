"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDatasetActions } from "@/hooks/useDatasetActions";

type Dataset = {
  id: string;
  cityName: string;
  isActive: boolean;
  isPublic: boolean;
  dataCount: number;
  template: {
    name: string;
    category: string;
  };
  area: {
    countryCode: string | null;
  };
  user?: {
    name: string | null;
    email: string;
  };
  _count?: {
    watchers: number;
  };
  canDelete?: boolean;
};

type DatasetListProps = {
  datasets: Dataset[];
  title: string;
  emptyMessage: string;
  emptyActionText: string;
  emptyActionHref: string;
  showCreateButton?: boolean;
  isOwned?: boolean;
  showCreator?: boolean;
};

export default function DatasetList({
  datasets,
  title,
  emptyMessage,
  emptyActionText,
  emptyActionHref,
  showCreateButton = false,
  isOwned = false,
  showCreator = false,
}: DatasetListProps) {
  const [localDatasets, setLocalDatasets] = useState(datasets);
  const { deletingId, handleDelete, toggleActive, togglePublic } =
    useDatasetActions();

  // Update local state when props change
  useEffect(() => {
    setLocalDatasets(datasets);
  }, [datasets]);

  const handleToggleActive = async (
    datasetId: string,
    currentValue: boolean
  ) => {
    // Optimistic update
    setLocalDatasets((prev) =>
      prev.map((dataset) =>
        dataset.id === datasetId
          ? { ...dataset, isActive: !currentValue }
          : dataset
      )
    );

    // Call the API
    await toggleActive(datasetId, currentValue, () => {
      // Success callback - no need to reload since we already updated optimistically
    });
  };

  const handleTogglePublic = async (
    datasetId: string,
    currentValue: boolean
  ) => {
    // Optimistic update
    setLocalDatasets((prev) =>
      prev.map((dataset) =>
        dataset.id === datasetId
          ? { ...dataset, isPublic: !currentValue }
          : dataset
      )
    );

    // Call the API
    await togglePublic(datasetId, currentValue, () => {
      // Success callback - no need to reload since we already updated optimistically
    });
  };

  const handleDeleteDataset = async (datasetId: string) => {
    const result = await handleDelete(datasetId);
    if (result.success) {
      // Remove from local state
      setLocalDatasets((prev) =>
        prev.filter((dataset) => dataset.id !== datasetId)
      );
    }
  };

  const renderDatasetCard = (dataset: Dataset) => (
    <div
      key={dataset.id}
      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-black dark:text-white">
            {dataset.template.name} in {dataset.cityName}
            {dataset.area.countryCode && ` (${dataset.area.countryCode})`}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {dataset.template.category}
          </p>
          {showCreator && dataset.user && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              by {dataset.user.name || dataset.user.email.split("@")[0]}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded ${
              dataset.isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {dataset.isActive ? "Active" : "Inactive"}
          </span>
          <span
            className={`px-2 py-1 text-xs rounded ${
              dataset.isPublic
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            }`}
          >
            {dataset.isPublic ? "Public" : "Private"}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        <p>Data count: {dataset.dataCount}</p>
        {dataset._count && <p>Watchers: {dataset._count.watchers}</p>}
      </div>

      <div className="flex justify-between items-center">
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/dataset/${dataset.id}`}>View</Link>
        </Button>

        {isOwned && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleToggleActive(dataset.id, dataset.isActive)}
              className="px-3 py-1 text-sm border border-black hover:bg-black hover:text-white transition-colors"
            >
              {dataset.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => handleTogglePublic(dataset.id, dataset.isPublic)}
              className="px-3 py-1 text-sm border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
            >
              {dataset.isPublic ? "Make Private" : "Make Public"}
            </button>
            {dataset.canDelete ? (
              <button
                onClick={() => handleDeleteDataset(dataset.id)}
                disabled={deletingId === dataset.id}
                className="px-3 py-1 text-sm border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
              >
                {deletingId === dataset.id ? "Deleting..." : "Delete"}
              </button>
            ) : (
              <button
                disabled
                title={`Cannot delete dataset with ${
                  dataset._count?.watchers || 0
                } watcher(s). Make it private first or ask watchers to unwatch it.`}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-400 cursor-not-allowed"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {title}
          </h2>
          {localDatasets.length > 0 && (
            <span className="text-sm text-gray-500">
              ({localDatasets.length})
            </span>
          )}
        </div>
        {showCreateButton && (
          <Button asChild>
            <Link
              href="/my-datasets/create"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Dataset
            </Link>
          </Button>
        )}
      </div>

      {localDatasets.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {emptyMessage}
          </p>
          <Button asChild>
            <Link href={emptyActionHref}>{emptyActionText}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {localDatasets.map((dataset) => renderDatasetCard(dataset))}
        </div>
      )}
    </div>
  );
}
