import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
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
  const user = await getUserFromCookie();
  const t = await getTranslations("UsersPage");

  if (!user) {
    return redirect({ href: "/", locale: "en" });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/watched", locale: "en" });
  }

  const users = await getUsers();

  return (
    <TabLayout activeTab="users" isAdmin={user.isAdmin}>
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
            {users.map((user) => (
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
                  <span>
                    {t("datasets")} {user._count.datasets}
                  </span>
                  <span>
                    {t("joined")}{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TabLayout>
  );
}
