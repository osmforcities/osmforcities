"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Plus, Users, FileText } from "lucide-react";

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

  const renderDatasetCard = (dataset: Dataset, showCreator = false) => (
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

      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>Data count: {dataset.dataCount}</span>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/dataset/${dataset.id}`}>View</Link>
        </Button>
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
              <Link href="/my-datasets">Browse Public Datasets</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {watchedDatasets.map((dataset) => renderDatasetCard(dataset, true))}
            {watchedDatasets.length >= 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/watched-datasets">View All</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="my-datasets" className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Your Datasets
          </h2>
          {createdDatasets.length > 0 && (
            <span className="text-sm text-gray-500">
              ({createdDatasets.length})
            </span>
          )}
        </div>

        {createdDatasets.length === 0 ? (
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
            {createdDatasets.map((dataset) => renderDatasetCard(dataset))}
            {createdDatasets.length >= 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/my-datasets">View All</Link>
                </Button>
              </div>
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
