import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { QuotaIndicator } from "@/components/dashboard/quota-indicator";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getTranslations, getLocale, getFormatter } from "next-intl/server";
import { MAX_SAVES_PER_USER } from "@/lib/constants";
import { LOCALE_DISPLAY_NAMES, type AvailableLocale } from "@/i18n/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users - OSM for Cities",
  description: "Platform users",
};

async function getUsers() {
  return prisma.user.findMany({
    include: {
      _count: {
        select: { savedDatasets: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

const languageName = (language: string) =>
  LOCALE_DISPLAY_NAMES[language as AvailableLocale] ?? language;

/**
 * Users admin page - redirects to /dashboard if not admin, /enter if not authenticated
 */
export default async function UsersPage() {
  const session = await auth();
  const user = session?.user || null;
  const locale = await getLocale();
  const t = await getTranslations("UsersPage");
  const tabT = await getTranslations("TabLayout");
  const format = await getFormatter();

  if (!user) {
    return redirect({ href: "/enter", locale });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/dashboard", locale });
  }

  const users = await getUsers();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              {tabT("welcomeBack", { name: user.name || user.email })}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {tabT("manageDatasetsSubtitle")}
            </p>
          </div>

          <DashboardTabs
            isAdmin={user.isAdmin}
            context="admin-users"
            activeTab="users"
          />

          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {t("users")}
              </h2>
              {users.length > 0 && (
                <span className="text-sm text-gray-500">
                  {t("openParen")}
                  {users.length}
                  {t("closeParen")}
                </span>
              )}
            </div>

            {users.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {t("noUsersFound")}
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {users.map((userItem) => (
                  <li key={userItem.id}>
                    <Card hoverable={false}>
                      <CardHeader>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold text-black dark:text-white">
                              {userItem.name || userItem.email.split("@")[0]}
                            </h3>
                            {userItem.isAdmin && (
                              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                {t("admin")}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                            {userItem.email}
                          </p>
                        </div>
                        <UserEditDialog
                          user={{
                            id: userItem.id,
                            email: userItem.email,
                            isAdmin: userItem.isAdmin,
                            saveLimit: userItem.saveLimit,
                          }}
                          isSelf={userItem.id === user.id}
                          defaultSaveLimit={MAX_SAVES_PER_USER}
                        />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <QuotaIndicator
                          used={userItem._count.savedDatasets}
                          limit={userItem.saveLimit ?? MAX_SAVES_PER_USER}
                          showInfo={false}
                        />
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                          <dt className="text-gray-500 dark:text-gray-400">{t("reports")}</dt>
                          <dd className="text-black dark:text-white">
                            {userItem.reportsEnabled
                              ? t("reportsOn", { frequency: userItem.reportsFrequency })
                              : t("reportsOff")}
                          </dd>
                          <dt className="text-gray-500 dark:text-gray-400">{t("lastReport")}</dt>
                          <dd className="text-black dark:text-white">
                            {userItem.lastReportSent
                              ? format.dateTime(userItem.lastReportSent, { dateStyle: "medium" })
                              : t("never")}
                          </dd>
                          <dt className="text-gray-500 dark:text-gray-400">{t("language")}</dt>
                          <dd className="text-black dark:text-white">
                            {languageName(userItem.language)}
                          </dd>
                          <dt className="text-gray-500 dark:text-gray-400">{t("joined")}</dt>
                          <dd className="text-black dark:text-white">
                            {format.dateTime(userItem.createdAt, { dateStyle: "medium" })}
                          </dd>
                        </dl>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
