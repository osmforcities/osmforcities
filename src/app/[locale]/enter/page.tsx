import { Metadata } from "next";
import AuthForm from "../auth-form";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EnterPage" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function EnterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("EnterPage");

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="flex flex-col items-center justify-center p-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-black dark:text-white">
              {t("signIn")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t("enterEmailToStart")}
            </p>
          </div>

          <AuthForm />
        </div>
      </div>
    </div>
  );
}
