"use client";

import { useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

interface DashboardTabsProps {
  isAdmin: boolean;
  context?: "dashboard" | "admin-users" | "admin-templates";
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

  const handleFollowingTabClick = () => {
    router.push("/");
  };

  // Determine which tabs to show and which is active
  const getTabsConfig = () => {
    if (context === "admin-users") {
      return {
        tabs: ["following", "users", "templates"],
        activeTab: activeTab || "users",
        layout: "grid-cols-3"
      };
    } else if (context === "admin-templates") {
      return {
        tabs: ["following", "users", "templates"],
        activeTab: activeTab || "templates",
        layout: "grid-cols-3"
      };
    } else {
      // dashboard context
      return {
        tabs: isAdmin ? ["following", "users", "templates"] : ["following"],
        activeTab: "following",
        layout: isAdmin ? "grid-cols-3" : "inline-flex"
      };
    }
  };

  const { tabs, activeTab: defaultValue, layout } = getTabsConfig();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8" data-testid="dashboard-tabs">
      <Tabs defaultValue={defaultValue} value={defaultValue} className="w-full">
        <TabsList className={`${layout} w-full`}>
          {tabs.includes("following") && (
            <TabsTrigger
              value="following"
              onClick={context !== "dashboard" ? handleFollowingTabClick : undefined}
              data-testid="tab-following"
              aria-label={tabT("followingAriaLabel")}
            >
              {tabT("following")}
            </TabsTrigger>
          )}

          {tabs.includes("users") && (
            <TabsTrigger
              value="users"
              onClick={context === "dashboard" || context === "admin-templates" ? handleUsersTabClick : undefined}
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
              onClick={context === "dashboard" || context === "admin-users" ? handleTemplatesTabClick : undefined}
              data-testid="tab-templates"
              aria-label={tabT("templatesAriaLabel")}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {tabT("templates")}
              </div>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
}

