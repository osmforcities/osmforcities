import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { PreferencesForm } from "./preferences-form";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";

export default async function PreferencesPage() {
  const session = await auth();
  const user = session?.user || null;
  const t = await getTranslations("PreferencesPage");

  if (!user) {
    return redirect({ href: "/enter", locale: "en" });
  }

  // Fetch user preferences from database
  const userPreferences = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      reportsEnabled: true,
      reportsFrequency: true,
      language: true,
    },
  });

  if (!userPreferences) {
    return redirect({ href: "/enter", locale: "en" });
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t("emailPreferences")}</h1>

      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t("reports")}</h2>
          <p className="text-gray-600 mb-4">{t("reportsDescription")}</p>

          <PreferencesForm
            initialReportsEnabled={userPreferences.reportsEnabled}
            initialReportsFrequency={userPreferences.reportsFrequency}
            initialLanguage={userPreferences.language}
          />
        </div>

        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">{t("magicLinks")}</h2>
          <p className="text-gray-600 mb-4">{t("magicLinksDescription")}</p>
        </div>
      </div>
    </div>
  );
}
