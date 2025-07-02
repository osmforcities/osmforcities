"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Plus, Users, FileText } from "lucide-react";
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

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
  tags: string[];
  _count: {
    datasets: number;
  };
};

type User = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  _count: {
    datasets: number;
  };
};

type HomeTabsProps = {
  createdDatasets: Dataset[];
  watchedDatasets: Dataset[];
  templates: Template[];
  users: User[];
  isAdmin: boolean;
};

export default function HomeTabs({
  createdDatasets,
  watchedDatasets,
  templates,
  users,
  isAdmin,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState("watched");
  const [localCreatedDatasets, setLocalCreatedDatasets] =
    useState(createdDatasets);
  const { deletingId, handleDelete, toggleActive, togglePublic } =
    useDatasetActions();

  // Update local state when props change
  useEffect(() => {
    setLocalCreatedDatasets(createdDatasets);
  }, [createdDatasets]);

  const handleToggleActive = async (
    datasetId: string,
    currentValue: boolean
  ) => {
    // Optimistic update
    setLocalCreatedDatasets((prev) =>
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
    setLocalCreatedDatasets((prev) =>
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
      setLocalCreatedDatasets((prev) =>
        prev.filter((dataset) => dataset.id !== datasetId)
      );
    }
  };

  const renderDatasetCard = (
    dataset: Dataset,
    showCreator = false,
    isOwned = false
  ) => (
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

  const renderTemplateCard = (template: Template) => (
    <div
      key={template.id}
      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-black dark:text-white">
            {template.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {template.category}
          </p>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {template.description}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs rounded ${
            template.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {template.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <div className="flex gap-2">
          <span>Datasets: {template._count.datasets}</span>
          {template.tags.length > 0 && (
            <span>Tags: {template.tags.slice(0, 2).join(", ")}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderUserCard = (user: User) => (
    <div
      key={user.id}
      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-black dark:text-white">
            {user.name || user.email.split("@")[0]}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded ${
              user.isAdmin
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {user.isAdmin ? "Admin" : "User"}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>Datasets: {user._count.datasets}</span>
        <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );

  return (
    <Tabs
      defaultValue="watched"
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
        <TabsTrigger value="watched" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Following
        </TabsTrigger>
        <TabsTrigger value="my-datasets" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          My Datasets
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="watched" className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Following
          </h2>
          {watchedDatasets.length > 0 && (
            <span className="text-sm text-gray-500">
              ({watchedDatasets.length})
            </span>
          )}
        </div>

        {watchedDatasets.length === 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You're not following any datasets yet.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Browse Public Datasets</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {watchedDatasets.map((dataset) => renderDatasetCard(dataset, true))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="my-datasets" className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Your Datasets
          </h2>
          {localCreatedDatasets.length > 0 && (
            <span className="text-sm text-gray-500">
              ({localCreatedDatasets.length})
            </span>
          )}
        </div>

        {localCreatedDatasets.length === 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't created any datasets yet.
            </p>
            <Button asChild>
              <Link href="/my-datasets/create">Create Your First Dataset</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {localCreatedDatasets.map((dataset) =>
              renderDatasetCard(dataset, false, true)
            )}
          </div>
        )}
      </TabsContent>

      {isAdmin && (
        <TabsContent value="templates" className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Templates
            </h2>
            {templates.length > 0 && (
              <span className="text-sm text-gray-500">
                ({templates.length})
              </span>
            )}
          </div>

          {templates.length === 0 ? (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No templates found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => renderTemplateCard(template))}
            </div>
          )}
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="users" className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Users
            </h2>
            {users.length > 0 && (
              <span className="text-sm text-gray-500">({users.length})</span>
            )}
          </div>

          {users.length === 0 ? (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No users found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => renderUserCard(user))}
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
