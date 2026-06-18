/* eslint-disable react/jsx-no-literals -- test-only admin page, no i18n needed */
import { Metadata } from "next";
import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getLocale } from "next-intl/server";

const DEMO_AREA_ID = "271110";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Hierarchy - OSM for Cities",
  description: "Test page showing template parent-child relationships",
};

function pickName(
  base: { name: string; translations: { locale: string; name: string }[] },
  locale: string,
): string {
  return base.translations.find((t) => t.locale === locale)?.name ?? base.name;
}

async function getTemplateHierarchy(locale: string) {
  const rows = await prisma.template.findMany({
    where: { parentId: null },
    include: {
      translations: { select: { locale: true, name: true } },
      category: { select: { slug: true } },
      children: {
        include: {
          translations: { select: { locale: true, name: true } },
          category: { select: { slug: true } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return rows
    .map((t) => ({
      id: t.id,
      name: pickName(t, locale),
      category: t.category?.slug ?? "other",
      children: t.children.map((c) => ({
        id: c.id,
        name: pickName(c, locale),
        category: c.category?.slug ?? "other",
      })),
    }))
    .filter((r) => r.children.length > 0);
}

export default async function TemplateHierarchyPage() {
  const session = await auth();
  const user = session?.user || null;
  const locale = await getLocale();

  if (!user) {
    return redirect({ href: "/enter", locale });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/dashboard", locale });
  }

  const roots = await getTemplateHierarchy(locale);
  const childCount = roots.reduce((acc, p) => acc + p.children.length, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              Template Hierarchy
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Parent-child relationships between templates (test page)
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {roots.length} parent templates with {childCount} children
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Links point to dataset pages for demo area (Amsterdam, OSM relation {DEMO_AREA_ID}).
            </p>
          </div>

          <div className="space-y-4">
            {roots.map((parent) => (
              <div
                key={parent.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-100 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/area/${DEMO_AREA_ID}/dataset/${parent.id}`}
                        className="text-lg font-semibold text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline"
                      >
                        {parent.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <code>{parent.id}</code> · {parent.category}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Parent
                    </span>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {parent.children.map((child) => (
                    <li
                      key={child.id}
                      className="p-4 pl-8 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">↳</span>
                            <Link
                              href={`/area/${DEMO_AREA_ID}/dataset/${child.id}`}
                              className="font-medium text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline"
                            >
                              {child.name}
                            </Link>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 pl-5">
                            <code>{child.id}</code> · {child.category}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Child
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
