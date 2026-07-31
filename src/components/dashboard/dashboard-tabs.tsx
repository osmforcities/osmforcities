/**
 * Dashboard tabs component - navigation between Saved/Users/Templates
 * Saved tab links to /dashboard, Users to /users, Templates to /templates
 */

"use client";

import { useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Activity } from "lucide-react";
import { useTranslations } from "next-intl";

interface DashboardTabsProps {
  isAdmin: boolean;
  context?: "dashboard" | "admin-users" | "admin-templates" | "admin-datasets";
  activeTab?: string;
}

export function DashboardTabs({
  isAdmin,
  context = "dashboard",
  activeTab
}: DashboardTabsProps) {
  const router = useRouter();
  const tabT = useTranslations("TabLayout");

  const handleUsersTabClick = () => {
    router.push("/users");
  };

  const handleTemplatesTabClick = () => {
    router.push("/templates");
  };

  const handleDatasetsTabClick = () => {
    router.push("/datasets");
  };

  const handleSavedTabClick = () => {
    router.push("/dashboard");
  };

  // Admin tabs, in display order
  const adminTabs = ["saved", "users", "templates", "datasets"];

  // Determine which tabs to show and which is active
  const getTabsConfig = () => {
    if (context === "admin-users") {
      return {
        tabs: adminTabs,
        activeTab: activeTab || "users",
        layout: "grid-cols-4"
      };
    } else if (context === "admin-templates") {
      return {
        tabs: adminTabs,
        activeTab: activeTab || "templates",
        layout: "grid-cols-4"
      };
    } else if (context === "admin-datasets") {
      return {
        tabs: adminTabs,
        activeTab: activeTab || "datasets",
        layout: "grid-cols-4"
      };
    } else {
      // dashboard context
      return {
        tabs: isAdmin ? adminTabs : ["saved"],
        activeTab: "saved",
        layout: isAdmin ? "grid-cols-4" : "inline-flex"
      };
    }
  };

  const { tabs, activeTab: defaultValue, layout } = getTabsConfig();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8" data-testid="dashboard-tabs">
      <Tabs defaultValue={defaultValue} value={defaultValue} className="w-full">
        <TabsList className={`${layout} w-full`}>
          {tabs.includes("saved") && (
            <TabsTrigger
              value="saved"
              onClick={defaultValue !== "saved" ? handleSavedTabClick : undefined}
              data-testid="tab-saved"
              aria-label={tabT("savedAriaLabel")}
            >
              {tabT("saved")}
            </TabsTrigger>
          )}

          {tabs.includes("users") && (
            <TabsTrigger
              value="users"
              onClick={defaultValue !== "users" ? handleUsersTabClick : undefined}
              data-testid="tab-users"
              aria-label={tabT("usersAriaLabel")}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {tabT("users")}
              </div>
            </TabsTrigger>
          )}

          {tabs.includes("templates") && (
            <TabsTrigger
              value="templates"
              onClick={defaultValue !== "templates" ? handleTemplatesTabClick : undefined}
              data-testid="tab-templates"
              aria-label={tabT("templatesAriaLabel")}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {tabT("templates")}
              </div>
            </TabsTrigger>
          )}

          {tabs.includes("datasets") && (
            <TabsTrigger
              value="datasets"
              onClick={defaultValue !== "datasets" ? handleDatasetsTabClick : undefined}
              data-testid="tab-datasets"
              aria-label={tabT("datasetsTabAriaLabel")}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {tabT("datasetsTab")}
              </div>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
}

