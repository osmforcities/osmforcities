import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveTemplateForLocale } from "@/lib/template-locale";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates - OSM for Cities",
  description: "Data templates",
};

async function getTemplates(locale: string) {
  const rows = await prisma.template.findMany({
    include: {
      translations: true,
      _count: { select: { datasets: true } },
    },
    orderBy: { name: "asc" },
  });
  return rows.map((t) => {
    const resolved = resolveTemplateForLocale(t, locale);
    return {
      ...resolved,
      _count: t._count,
    };
  });
}

export default async function TemplatesPage() {
  const session = await auth();
  const user = session?.user || null;
  const locale = await getLocale();
  const t = await getTranslations("TemplatesPage");
  const tabT = await getTranslations("TabLayout");

  if (!user) {
    return redirect({ href: "/", locale: "en" });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/", locale: "en" });
  }

  const templates = await getTemplates(locale);

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
            context="admin-templates"
            activeTab="templates"
          />

          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {t("templates")}
              </h2>
              {templates.length > 0 && (
                <span className="text-sm text-gray-500">
                  {t("openParen")}
                  {templates.length}
                  {t("closeParen")}
                </span>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {t("noTemplatesFound")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-black dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {template.category}
                        </p>
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          template.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex gap-2">
                        <span>
                          {t("datasets")} {template._count.datasets}
                        </span>
                        {template.tags.length > 0 && (
                          <span>
                            {t("tags")} {template.tags.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>
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
