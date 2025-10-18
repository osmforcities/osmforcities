import { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OSM for Cities - Monitor OpenStreetMap Datasets",
  description:
    "Track changes in OpenStreetMap datasets across cities worldwide.",
};

async function getWatchedDatasets(userId: string) {
  const watchedDatasets = await prisma.datasetWatch.findMany({
    where: { userId },
    include: {
      dataset: {
        include: {
          template: true,
          area: true,
          _count: {
            select: { watchers: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return watchedDatasets.map((watch) => watch.dataset);
}

async function getTemplates() {
  const templates = await prisma.template.findMany({
    include: {
      _count: {
        select: { datasets: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return templates;
}

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

export default async function Home() {
  const session = await auth();
  const user = session?.user || null;
  const t = await getTranslations("Index");
  const tabT = await getTranslations("TabLayout");

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-full max-w-2xl text-center p-4 space-y-8">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
            {t("title")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/about">{t("learnMore")}</Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/enter">{t("enter")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fetch watched datasets for the dashboard grid
  const watchedDatasets = await getWatchedDatasets(user.id);

  // Fetch admin data only if user is admin
  const templates = user.isAdmin ? await getTemplates() : [];
  const users = user.isAdmin ? await getUsers() : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {tabT("welcomeBack", { name: user.name || user.email })}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {tabT("manageDatasetsSubtitle")}
            </p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
          <DashboardGrid datasets={watchedDatasets} />
        </div>

        {/* Admin Features - Only show for admin users */}
        {user.isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Templates Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {tabT("templates")}
                </h2>
                <span className="text-sm text-gray-500">
                  {tabT("openParen")}{templates.length}{tabT("closeParen")}
                </span>
              </div>
              <div className="space-y-3">
                {templates.slice(0, 5).map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {template.category}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          template.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{tabT("datasets")}{": "}{template._count.datasets}</p>
                    </div>
                  </div>
                ))}
                {templates.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/templates">{tabT("viewAllTemplates")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Users Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{tabT("users")}</h2>
                <span className="text-sm text-gray-500">{tabT("openParen")}{users.length}{tabT("closeParen")}</span>
              </div>
              <div className="space-y-3">
                {users.slice(0, 5).map((userItem) => (
                  <div
                    key={userItem.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {userItem.name || userItem.email.split("@")[0]}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {userItem.email}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          userItem.isAdmin
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {userItem.isAdmin ? "Admin" : "User"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{tabT("datasets")}{": "}{userItem._count.datasets}</p>
                    </div>
                  </div>
                ))}
                {users.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/users">{tabT("viewAllUsers")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
