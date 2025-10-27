import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users - OSM for Cities",
  description: "Platform users",
};

async function getUsers() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { datasets: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export default async function UsersPage() {
  const session = await auth();
  const user = session?.user || null;
  const t = await getTranslations("UsersPage");
  const tabT = await getTranslations("TabLayout");

  if (!user) {
    return redirect({ href: "/", locale: "en" });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/", locale: "en" });
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
              <div className="space-y-3">
                {users.map((userItem) => (
                  <div
                    key={userItem.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-black dark:text-white">
                          {userItem.name || userItem.email.split("@")[0]}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {userItem.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            userItem.isAdmin
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {userItem.isAdmin ? "Admin" : "User"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        {t("datasets")} {userItem._count.datasets}
                      </span>
                      <span>
                        {t("joined")}{" "}
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
