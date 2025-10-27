"use client";

import { useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface DashboardTabsProps {
  isAdmin: boolean;
}

export function DashboardTabs({ isAdmin }: DashboardTabsProps) {
  const router = useRouter();
  const tabT = useTranslations("TabLayout");

  const handleUsersTabClick = () => {
    router.push("/users");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8" data-testid="dashboard-tabs">
      <Tabs defaultValue="following" className="w-full">
        <TabsList className={isAdmin ? "grid grid-cols-2 w-full" : "inline-flex w-full"}>
          <TabsTrigger value="following" data-testid="tab-following" aria-label={tabT("followingAriaLabel")}>
            {tabT("following")}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="users"
              onClick={handleUsersTabClick}
              data-testid="tab-users"
              aria-label={tabT("usersAriaLabel")}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {tabT("users")}
              </div>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
}

