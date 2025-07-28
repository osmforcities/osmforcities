import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { PreferencesForm } from "./preferences-form";
import { getTranslations } from "next-intl/server";

export default async function PreferencesPage() {
  const user = await getUserFromCookie();
  const t = await getTranslations("PreferencesPage");

  if (!user) {
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
            initialReportsEnabled={user.reportsEnabled}
            initialReportsFrequency={user.reportsFrequency}
            initialLanguage={user.language}
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
