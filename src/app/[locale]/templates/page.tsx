import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates - OSM for Cities",
  description: "Data templates",
};

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

export default async function TemplatesPage() {
  const session = await auth();
  const user = session?.user || null;
  const t = await getTranslations("TemplatesPage");

  if (!user) {
    return redirect({ href: "/", locale: "en" });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/watched", locale: "en" });
  }

  const templates = await getTemplates();

  return (
    <TabLayout activeTab="templates" isAdmin={user.isAdmin}>
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
    </TabLayout>
  );
}
