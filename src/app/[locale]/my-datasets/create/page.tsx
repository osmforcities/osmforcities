import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import CreateDatasetWizard from "./create-dataset-wizard";
import { getTranslations } from "next-intl/server";

async function getTemplatesData() {
  const session = await auth();
  const user = session?.user || null;

  if (!user) {
    return redirect({ href: "/", locale: "en" });
  }

  // Get all available templates
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      overpassQuery: true,
      tags: true,
    },
    orderBy: { name: "asc" },
  });

  return { user, templates };
}

export default async function CreateDatasetPage() {
  const t = await getTranslations("CreateDatasetPage");
  const { user, templates } = await getTemplatesData();

  if (!user) {
    redirect({ href: "/", locale: "en" });
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border-b border-black pb-4 mb-8">
          <div className="flex items-center mb-2">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center mr-4"
            >
              {t("backToHome")}
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{t("createNewDataset")}</h1>
          <p className="text-gray-600 mt-2">{t("createDescription")}</p>
        </div>

        <div className="border border-black p-6">
          <CreateDatasetWizard templates={templates} userId={user.id} />
        </div>
      </div>
    </div>
  );
}
