"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

type TabLayoutProps = {
  children: React.ReactNode;
  activeTab: "templates" | "users";
};

export default function TabLayout({
  children,
  activeTab,
}: TabLayoutProps) {
  const t = useTranslations("TabLayout");
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              {t("welcomeBackGeneric")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("manageDatasetsSubtitle")}
            </p>
          </div>

          <Tabs defaultValue={activeTab} value={activeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
                <Link href="/templates" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("templates")}
                </Link>
              </TabsTrigger>
              <TabsTrigger value="users">
                <Link href="/users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("users")}
                </Link>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">{children}</div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
