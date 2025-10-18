"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Users, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import DatasetList from "@/components/dataset/list";

// Define the Dataset type to match what the API returns
type Dataset = {
  id: string;
  cityName: string;
  isActive: boolean;
  dataCount: number;
  template: {
    id: string;
    name: string;
    category: string;
    description?: string | null;
  };
  area: {
    id: number;
    name: string;
    countryCode: string | null;
  };
  user?: {
    name: string | null;
    email: string;
  } | null;
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

type HomeTabLayoutProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    isAdmin: boolean;
  };
  watchedDatasets: Dataset[];
  templates?: Template[];
  users?: User[];
};

export default function HomeTabLayout({
  user,
  watchedDatasets,
  templates = [],
  users = [],
}: HomeTabLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("TabLayout");
  const watchedT = useTranslations("Watched");

  // Get tab from URL parameter, default to "watched"
  const activeTab = searchParams.get("tab") || "watched";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {t("welcomeBack")}
              {", "}
              {user.name || user.email}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {t("manageDatasetsSubtitle")}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            <TabsTrigger value="watched" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t("following")}
              {watchedDatasets.length > 0 && (
                <span className="hidden sm:inline-block text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {watchedDatasets.length}
                </span>
              )}
            </TabsTrigger>
            {user.isAdmin && (
              <TabsTrigger
                value="templates"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {t("templates")}
                {templates.length > 0 && (
                  <span className="hidden sm:inline-block text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {templates.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {user.isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("users")}
                {users.length > 0 && (
                  <span className="hidden sm:inline-block text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {users.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab Content */}
          <div className="mt-6">
            <TabsContent value="watched" className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <DatasetList
                  datasets={watchedDatasets as unknown as Parameters<typeof DatasetList>[0]['datasets']}
                  title={watchedT("title")}
                  emptyMessage={watchedT("emptyMessage")}
                  emptyActionText={watchedT("emptyActionText")}
                  emptyActionHref="/"
                  showCreator
                />
              </div>
            </TabsContent>


            {user.isAdmin && (
              <TabsContent value="templates" className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                  {/* Templates will be implemented in Phase 3 */}
                  <p className="text-gray-500">{t("templatesComingSoon")}</p>
                </div>
              </TabsContent>
            )}

            {user.isAdmin && (
              <TabsContent value="users" className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                  {/* Users will be implemented in Phase 3 */}
                  <p className="text-gray-500">{t("usersComingSoon")}</p>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
