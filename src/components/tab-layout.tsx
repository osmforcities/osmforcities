"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Plus, Users, FileText, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

type Dataset = {
  id: string;
  cityName: string;
  isActive: boolean;
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

type TabLayoutProps = {
  children: React.ReactNode;
  activeTab: "watched" | "my-datasets" | "public" | "templates" | "users";
  isAdmin: boolean;
  watchedDatasets?: Dataset[];
  createdDatasets?: Dataset[];
  publicDatasets?: Dataset[];
  templates?: Template[];
  users?: User[];
};

export default function TabLayout({
  children,
  activeTab,
  isAdmin,
}: TabLayoutProps) {
  const t = useTranslations("TabLayout");
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              {t("welcomeBack")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("manageDatasetsSubtitle")}
            </p>
          </div>

          <Tabs defaultValue={activeTab} value={activeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="watched">
                <Link href="/watched" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t("following")}
                </Link>
              </TabsTrigger>
              <TabsTrigger value="my-datasets">
                <Link href="/my-datasets" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("myDatasets")}
                </Link>
              </TabsTrigger>
              <TabsTrigger value="public">
                <Link href="/public" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t("publicDatasets")}
                </Link>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="templates">
                  <Link href="/templates" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("templates")}
                  </Link>
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="users">
                  <Link href="/users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t("users")}
                  </Link>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="mt-6">{children}</div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
